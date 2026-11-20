/**
 * Registro presenze web — modello riutilizzabile per Google Apps Script.
 *
 * I dati d'esempio sono intenzionalmente fittizi: configura gruppi e allenatori
 * nella costante GROUPS prima del deploy.
 */
const SHEET_NAME = 'Presenze';
const STATUS_VALUES = ['P', 'A', 'R'];

const GROUPS = [
  { label: 'Lunedì — Gruppo base', day: 1, coaches: ['Allenatore 1'], names: ['Atleta 01', 'Atleta 02', 'Atleta 03'] },
  { label: 'Mercoledì — Gruppo intermedio', day: 3, coaches: ['Allenatore 1', 'Allenatore 2'], names: ['Atleta 02', 'Atleta 04', 'Atleta 05'] },
  { label: 'Sabato — Gruppo avanzato', day: 6, coaches: ['Allenatore 2'], names: ['Atleta 01', 'Atleta 03', 'Atleta 06'] },
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Pagina')
    .setTitle('Registro presenze')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getGruppi() {
  return GROUPS.map(function (group) {
    return { label: group.label, day: group.day, coaches: group.coaches, names: group.names };
  });
}

function getPresenze(date, groupLabel) {
  validateDate_(date);
  const group = getGroup_(groupLabel);
  const rows = getSheet_().getDataRange().getValues();
  const result = {};

  for (let row = 1; row < rows.length; row += 1) {
    if (formatDate_(rows[row][1]) === date && rows[row][2] === group.label) {
      result[rows[row][4]] = rows[row][5];
    }
  }
  return result;
}

function salvaPresenze(payload) {
  validatePayload_(payload);
  const group = getGroup_(payload.group);
  const rows = group.names
    .filter(function (name) { return STATUS_VALUES.indexOf(payload.presences[name]) !== -1; })
    .map(function (name) {
      return [new Date(), payload.date, group.label, payload.coach.trim().slice(0, 100), name, payload.presences[name]];
    });

  if (!rows.length) throw new Error('Seleziona almeno una presenza.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20 * 1000);
  try {
    const sheet = getSheet_();
    const existingRows = sheet.getDataRange().getValues();
    const existingByAthlete = {};
    for (let index = 1; index < existingRows.length; index += 1) {
      if (formatDate_(existingRows[index][1]) === payload.date && existingRows[index][2] === group.label) {
        existingByAthlete[existingRows[index][4]] = index + 1;
      }
    }

    const newRows = [];
    rows.forEach(function (row) {
      const rowNumber = existingByAthlete[row[4]];
      if (rowNumber) sheet.getRange(rowNumber, 1, 1, 6).setValues([row]);
      else newRows.push(row);
    });
    if (newRows.length) sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 6).setValues(newRows);
    return { count: rows.length };
  } finally {
    lock.releaseLock();
  }
}

function getRegistroUrl() {
  return getSheet_().getParent().getUrl();
}

function getSheet_() {
  const properties = PropertiesService.getScriptProperties();
  let id = properties.getProperty('REGISTRO_ID');
  if (!id) {
    const spreadsheet = SpreadsheetApp.create('Registro presenze');
    const sheet = spreadsheet.getSheets()[0];
    sheet.setName(SHEET_NAME);
    sheet.appendRow(['Registrato il', 'Data allenamento', 'Giorno e turno', 'Allenatore', 'Atleta', 'Esito']);
    id = spreadsheet.getId();
    properties.setProperty('REGISTRO_ID', id);
  }
  return SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME);
}

function getGroup_(label) {
  const group = GROUPS.filter(function (item) { return item.label === label; })[0];
  if (!group) throw new Error('Turno non valido.');
  return group;
}

function validateDate_(date) {
  if (typeof date !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(date)) throw new Error('Inserisci una data valida.');
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Dati mancanti.');
  validateDate_(payload.date);
  if (typeof payload.coach !== 'string' || !payload.coach.trim()) throw new Error('Inserisci il nome dell’allenatore.');
  if (!payload.presences || typeof payload.presences !== 'object') throw new Error('Presenze mancanti.');
}

function formatDate_(value) {
  return value instanceof Date
    ? Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd')
    : String(value);
}
