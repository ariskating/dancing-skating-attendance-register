import { BlobPreconditionFailedError, get, put } from '@vercel/blob';

export const groups = [
  { id: 'base', label: 'Lunedì · Gruppo base', coaches: ['Allenatore 1'], names: ['Atleta 01', 'Atleta 02', 'Atleta 03'] },
  { id: 'intermediate', label: 'Mercoledì · Gruppo intermedio', coaches: ['Allenatore 1', 'Allenatore 2'], names: ['Atleta 02', 'Atleta 04', 'Atleta 05'] },
  { id: 'advanced', label: 'Sabato · Gruppo avanzato', coaches: ['Allenatore 2'], names: ['Atleta 01', 'Atleta 03', 'Atleta 06'] },
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
  if (typeof groupId !== 'string' || !/^[a-z-]{2,32}$/.test(groupId)) throw new Error('Gruppo non valido.');
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
