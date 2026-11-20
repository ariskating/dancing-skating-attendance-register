import { getGroups, sendJson } from './lib/store.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Metodo non consentito.' });
  try { return sendJson(response, 200, { groups: await getGroups() }); }
  catch (error) { return sendJson(response, 500, { error: 'Configurazione privata non disponibile.' }); }
}
