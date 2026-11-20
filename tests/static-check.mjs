import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../Code.gs', import.meta.url), 'utf8');
const page = await readFile(new URL('../Pagina.html', import.meta.url), 'utf8');
const requiredServerFunctions = ['doGet', 'getGruppi', 'getPresenze', 'salvaPresenze'];

for (const name of requiredServerFunctions) {
  if (!new RegExp(`function ${name}\\(`).test(source)) throw new Error(`Funzione backend assente: ${name}`);
}
for (const name of ['getGruppi', 'getPresenze', 'salvaPresenze']) {
  if (!page.includes(`.${name}`)) throw new Error(`Chiamata client assente: ${name}`);
}
if (!/Atleta \d{2}/.test(source)) throw new Error('Mancano i dati di esempio anonimizzati.');
console.log('Controlli statici superati: API client/backend allineate e dati di esempio presenti.');
