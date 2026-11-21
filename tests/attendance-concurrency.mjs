import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { normalizeBlobEtag } from '../api/lib/store.js';

assert.equal(normalizeBlobEtag('W/"versione"'), '"versione"');
assert.equal(normalizeBlobEtag('"versione"'), '"versione"');

const group = { id: 'test-group', names: ['Atleta'], coaches: ['Staff'] };
let existing = { value: { staff: ['Staff'], attendance: [{ athleteId: 'Atleta storica', status: 'A' }] }, etag: 'versione-1' };
let written = 0;
const store = {
  assertSameOrigin() {}, getGroups: async () => [group],
  requireDate: date => date, requireGroup: () => group,
  readRecord: async () => existing,
  sendJson: (_response, status, body) => ({ status, body }),
  writeRecord: async (_path, record, etag) => { assert.equal(etag, 'versione-1'); assert.equal(record.staff.length, 0); assert.ok(record.attendance.some(entry => entry.athleteId === 'Atleta storica' && entry.status === 'A')); written++; return { etag: 'versione-2' }; },
  writeAudit: async () => {},
};
const context = vm.createContext({ console, crypto: { randomUUID: () => 'test' }, Date, JSON, Set, Object, Array, Error, SyntaxError });
const module = new vm.SourceTextModule(await readFile(new URL('../api/attendance.js', import.meta.url), 'utf8'), { context });
await module.link(() => new vm.SyntheticModule(Object.keys(store), function () { for (const [key, value] of Object.entries(store)) this.setExport(key, value); }, { context }));
await module.evaluate();
const handler = module.namespace.default;
const request = { method: 'POST', headers: {}, body: { date: '2026-11-20', groupId: group.id, staff: [], attendance: { Atleta: 'P' }, extras: [], version: 'versione-1' } };
assert.equal((await handler(request, {})).status, 200);
assert.equal(written, 1);
request.body.version = 'versione-vecchia';
assert.equal((await handler(request, {})).status, 409);
assert.equal(written, 1);
console.log('Correzione e conflitto tra dispositivi verificati.');
