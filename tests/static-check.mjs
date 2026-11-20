import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../Code.gs', import.meta.url), 'utf8');
const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../assets/app.js', import.meta.url), 'utf8');
const api = await readFile(new URL('../api/attendance.js', import.meta.url), 'utf8');
const store = await readFile(new URL('../api/lib/store.js', import.meta.url), 'utf8');
const requiredServerFunctions = ['doGet', 'getGruppi', 'getPresenze', 'salvaPresenze'];

for (const name of requiredServerFunctions) {
  if (!new RegExp(`function ${name}\\(`).test(source)) throw new Error(`Funzione backend assente: ${name}`);
}
if (!page.includes('vue.global.prod.js')) throw new Error('Manca il runtime Vue di produzione.');
if (!app.includes('createApp')) throw new Error('Manca l’inizializzazione Vue.');
if (!app.includes("/api/attendance")) throw new Error('Manca il collegamento all’API presenze.');
if (/google\.script\.run/.test(`${page}\n${app}`)) throw new Error('Il frontend Vercel non può dipendere dalle API HTML di Apps Script.');
if (!/Atleta \d{2}/.test(source)) throw new Error('Mancano i dati di esempio anonimizzati.');
if (!api.includes('assertSameOrigin') || !store.includes('ifMatch')) throw new Error('Mancano le protezioni API per origine e concorrenza.');
if (!store.includes("access: 'private'")) throw new Error('Il salvataggio Blob deve restare privato.');
console.log('Controlli statici superati: Vue, API privata, convalida e concorrenza Blob presenti.');
