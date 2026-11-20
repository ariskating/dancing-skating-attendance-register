import { assertSameOrigin, readRecord, requireDate, requireGroup, sendJson, writeAudit, writeRecord } from './lib/store.js';

const allowedStatuses = new Set(['P', 'A', 'R']);

function pathnameFor(date, groupId) { return `attendance/${date}/${groupId}.json`; }

function parseBody(request) {
  const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
  if (!body || typeof body !== 'object') throw new Error('Corpo della richiesta non valido.');
  return body;
}

function normalizeRecord(input) {
  const date = requireDate(input.date);
  const group = requireGroup(input.groupId);
  const staff = Array.isArray(input.staff) ? [...new Set(input.staff)] : [input.coach].filter(Boolean);
  if (!staff.length || staff.some((name) => typeof name !== 'string' || !group.coaches.includes(name))) throw new Error('Staff non valido.');
  if (!input.attendance || typeof input.attendance !== 'object' || Array.isArray(input.attendance)) throw new Error('Presenze non valide.');
  const allowedAthletes = new Set(group.names);
  const attendance = Object.entries(input.attendance)
    .filter(([, status]) => status !== undefined && status !== '')
    .map(([athleteId, status]) => {
      if (!allowedAthletes.has(athleteId) || !allowedStatuses.has(status)) throw new Error('Presenza non valida.');
      return { athleteId, status };
    });
  if (attendance.length > group.names.length) throw new Error('Troppe presenze.');
  const extras = Array.isArray(input.extras) ? input.extras : [];
  if (extras.length > 25) throw new Error('Troppi atleti extra.');
  const normalizedExtras = extras.map((extra) => {
    if (!extra || typeof extra.name !== 'string' || !/\S/.test(extra.name) || extra.name.length > 100) throw new Error('Nome extra non valido.');
    if (!['Prova', 'Recupero'].includes(extra.type) || !allowedStatuses.has(extra.status)) throw new Error('Atleta extra non valido.');
    return { name: extra.name.trim(), type: extra.type, status: extra.status };
  });
  return { date, group, staff, attendance, extras: normalizedExtras };
}

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      const date = requireDate(request.query.date);
      const group = requireGroup(request.query.groupId);
      const existing = await readRecord(pathnameFor(date, group.id));
      return sendJson(response, 200, { record: existing ? { ...existing.value, version: existing.etag } : null });
    }
    if (request.method !== 'POST') return sendJson(response, 405, { error: 'Metodo non consentito.' });
    assertSameOrigin(request);
    const input = normalizeRecord(parseBody(request));
    const pathname = pathnameFor(input.date, input.group.id);
    const existing = await readRecord(pathname);
    if ((input.version || null) !== (existing?.etag || null)) return sendJson(response, 409, { error: 'Versione non aggiornata.', current: existing ? { ...existing.value, version: existing.etag } : null });
    const record = { schemaVersion: 2, date: input.date, groupId: input.group.id, staff: input.staff, attendance: input.attendance, extras: input.extras, savedAt: new Date().toISOString(), revision: crypto.randomUUID() };
    let saved;
    try { saved = await writeRecord(pathname, record, existing?.etag); }
    catch (error) { if (error.code === 'CONFLICT') { const current = await readRecord(pathname); return sendJson(response, 409, { error: 'Versione non aggiornata.', current: current ? { ...current.value, version: current.etag } : null }); } throw error; }
    await writeAudit({ type: 'attendance.saved', at: record.savedAt, date: record.date, groupId: record.groupId, revision: record.revision, count: record.attendance.length, requestId: request.headers['x-vercel-id'] || null });
    return sendJson(response, 200, { record: { ...record, version: saved.etag } });
  } catch (error) {
    return sendJson(response, 400, { error: error instanceof SyntaxError ? 'JSON non valido.' : error.message || 'Richiesta non valida.' });
  }
}
