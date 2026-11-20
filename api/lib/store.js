import { BlobPreconditionFailedError, get, put } from '@vercel/blob';

export const groups = [
  { id: 'lun-16', day: 1, venue: 'Tito', label: 'Lunedì · Turno 16:00', coaches: ['Allenatore 1', 'Allenatore 2'], names: ['Atleta 01', 'Atleta 02', 'Atleta 03', 'Atleta 04'] },
  { id: 'lun-17', day: 1, venue: 'Tito', label: 'Lunedì · Turno 17:00', coaches: ['Allenatore 1', 'Allenatore 2'], names: ['Atleta 05', 'Atleta 06', 'Atleta 07', 'Atleta 08'] },
  { id: 'mar-17', day: 2, venue: 'EUR', label: 'Martedì · Junior e avviamento', coaches: ['Allenatore 2', 'Allenatore 3'], names: ['Atleta 01', 'Atleta 04', 'Atleta 09', 'Atleta 10'] },
  { id: 'mer-16', day: 3, venue: 'Tito', label: 'Mercoledì · Turno 16:00', coaches: ['Allenatore 1', 'Allenatore 3'], names: ['Atleta 02', 'Atleta 03', 'Atleta 05', 'Atleta 11'] },
  { id: 'gio-17', day: 4, venue: 'Tito', label: 'Giovedì · Turno 17:00', coaches: ['Allenatore 1', 'Allenatore 2'], names: ['Atleta 06', 'Atleta 07', 'Atleta 08', 'Atleta 12'] },
  { id: 'ven-18', day: 5, venue: 'EUR', label: 'Venerdì · Master 18:00', coaches: ['Allenatore 2', 'Allenatore 3'], names: ['Atleta 01', 'Atleta 03', 'Atleta 09', 'Atleta 12'] },
  { id: 'sab-16', day: 6, venue: 'EUR', label: 'Sabato · Master 16:00', coaches: ['Allenatore 1', 'Allenatore 3'], names: ['Atleta 02', 'Atleta 04', 'Atleta 10', 'Atleta 11'] },
];

export function sendJson(response, status, body) {
  response.status(status).setHeader('Cache-Control', 'private, no-store, max-age=0').setHeader('Content-Type', 'application/json; charset=utf-8').send(JSON.stringify(body));
}

export function assertSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return;
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const permitted = `${protocol}://${host}`;
  if (origin !== permitted && !/^http:\/\/localhost(?::\d+)?$/.test(origin)) throw new Error('Origine della richiesta non autorizzata.');
}

export function requireGroup(groupId) {
  if (typeof groupId !== 'string' || !/^[a-z0-9-]{2,32}$/.test(groupId)) throw new Error('Gruppo non valido.');
  const group = groups.find((item) => item.id === groupId);
  if (!group) throw new Error('Gruppo non valido.');
  return group;
}

export function requireDate(date) {
  if (typeof date !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(date)) throw new Error('Data non valida.');
  return date;
}

export async function readRecord(pathname) {
  const result = await get(pathname, { access: 'private' });
  if (!result) return null;
  return { value: await new Response(result.stream).json(), etag: result.etag };
}

export async function writeRecord(pathname, value, etag) {
  try {
    return await put(pathname, JSON.stringify(value), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: Boolean(etag), ...(etag ? { ifMatch: etag } : {}) });
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError || error?.name === 'BlobPreconditionFailedError') error.code = 'CONFLICT';
    throw error;
  }
}

export async function writeAudit(value) {
  await put(`audit/${new Date().toISOString()}-${crypto.randomUUID()}.json`, JSON.stringify(value), { access: 'private', contentType: 'application/json', addRandomSuffix: false });
}
