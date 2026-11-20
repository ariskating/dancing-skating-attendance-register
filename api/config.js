import { groups, sendJson } from './lib/store.js';

export default function handler(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Metodo non consentito.' });
  return sendJson(response, 200, { groups });
}
