<script setup>
import { computed, ref } from 'vue';

const fallbackGroups = [
  { id: 'lun-16', day: 1, venue: 'Tito', label: 'Lunedì · Turno 16:00', coaches: ['Allenatore 1', 'Allenatore 2'], names: ['Atleta 01', 'Atleta 02', 'Atleta 03', 'Atleta 04'] },
  { id: 'lun-17', day: 1, venue: 'Tito', label: 'Lunedì · Turno 17:00', coaches: ['Allenatore 1', 'Allenatore 2'], names: ['Atleta 05', 'Atleta 06', 'Atleta 07', 'Atleta 08'] },
  { id: 'mar-17', day: 2, venue: 'EUR', label: 'Martedì · Junior e avviamento', coaches: ['Allenatore 2', 'Allenatore 3'], names: ['Atleta 01', 'Atleta 04', 'Atleta 09', 'Atleta 10'] },
  { id: 'mer-16', day: 3, venue: 'Tito', label: 'Mercoledì · Turno 16:00', coaches: ['Allenatore 1', 'Allenatore 3'], names: ['Atleta 02', 'Atleta 03', 'Atleta 05', 'Atleta 11'] },
  { id: 'gio-17', day: 4, venue: 'Tito', label: 'Giovedì · Turno 17:00', coaches: ['Allenatore 1', 'Allenatore 2'], names: ['Atleta 06', 'Atleta 07', 'Atleta 08', 'Atleta 12'] },
  { id: 'ven-18', day: 5, venue: 'EUR', label: 'Venerdì · Master 18:00', coaches: ['Allenatore 2', 'Allenatore 3'], names: ['Atleta 01', 'Atleta 03', 'Atleta 09', 'Atleta 12'] },
  { id: 'sab-16', day: 6, venue: 'EUR', label: 'Sabato · Master 16:00', coaches: ['Allenatore 1', 'Allenatore 3'], names: ['Atleta 02', 'Atleta 04', 'Atleta 10', 'Atleta 11'] },
];
const days = [{ id: 1, name: 'LUN', place: 'Tito' }, { id: 2, name: 'MAR', place: 'EUR' }, { id: 3, name: 'MER', place: 'Tito' }, { id: 4, name: 'GIO', place: 'Tito' }, { id: 5, name: 'VEN', place: 'EUR' }, { id: 6, name: 'SAB', place: 'EUR' }];
const statusOrder = ['', 'P', 'A', 'R'];
const statusText = { P: 'P', A: 'A', R: '☔' };
const monthNames = ['Ottobre', 'Novembre', 'Dicembre'];
const now = new Date();
const year = ref(now.getFullYear());
const month = ref([9, 10, 11].includes(now.getMonth()) ? now.getMonth() + 1 : 10);
const initialDay = now.getDay() >= 1 && now.getDay() <= 6 ? now.getDay() : 1;
const groups = ref(fallbackGroups);
const day = ref(initialDay);
const groupId = ref(fallbackGroups.find((group) => group.day === initialDay)?.id || fallbackGroups[0].id);
const selectedStaff = ref([]);
const records = ref({});
const extras = ref({});
const selectedDate = ref('');
const status = ref('Caricamento archivio privato…');
const loading = ref(false);
const saving = ref(false);
const extraPanelOpen = ref(false);
const dirty = ref(false);

const pad = (value) => String(value).padStart(2, '0');
const isoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const today = isoDate(now);
const activeGroups = computed(() => groups.value.filter((group) => group.day === day.value));
const activeGroup = computed(() => activeGroups.value.find((group) => group.id === groupId.value) || activeGroups.value[0] || groups.value[0]);
const sessionDates = computed(() => {
  const dates = [];
  const last = new Date(year.value, month.value, 0).getDate();
  for (let index = 1; index <= last; index += 1) { const candidate = new Date(year.value, month.value - 1, index); if (candidate.getDay() === day.value) dates.push(isoDate(candidate)); }
  return dates;
});
const monthTitle = computed(() => `Appello mensile · ${monthNames[month.value - 10]} ${year.value}`);
const currentExtras = computed(() => extras.value[selectedDate.value] || []);
const isEurDay = computed(() => activeGroup.value?.venue === 'EUR');

async function request(url, options) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(payload.error || 'Operazione non riuscita.'); error.status = response.status; error.current = payload.current; throw error; }
  return payload;
}
function recordFor(date) { return records.value[date] || { attendance: [], staff: [], extras: [], version: null }; }
function statusesFor(date) { return Object.fromEntries(recordFor(date).attendance.map((entry) => [entry.athleteId, entry.status])); }
function markDirty(message = 'Modifiche non salvate · premi Salva appello della data selezionata.') { dirty.value = true; status.value = message; }
function confirmDiscard() { return !dirty.value || window.confirm('Ci sono modifiche non salvate. Vuoi abbandonarle?'); }
function chooseDay(value) { if (!confirmDiscard()) return; day.value = value; groupId.value = groups.value.find((group) => group.day === value)?.id || groups.value[0].id; selectedStaff.value = []; dirty.value = false; loadMonth(); }
function chooseGroup(value) { if (!confirmDiscard()) return; groupId.value = value; selectedStaff.value = []; dirty.value = false; loadMonth(); }
function chooseMonth(value) { if (!confirmDiscard()) return; month.value = value; dirty.value = false; loadMonth(); }
function selectDate(value) { if (value !== selectedDate.value && !confirmDiscard()) return; dirty.value = false; selectedDate.value = value; selectedStaff.value = [...(recordFor(value).staff || [])]; status.value = 'Data selezionata. Puoi aggiornare l’appello.'; }
function toggleStaff(name) { selectedStaff.value = selectedStaff.value.includes(name) ? selectedStaff.value.filter((item) => item !== name) : [...selectedStaff.value, name]; markDirty(); }
function cycleAttendance(name, date) {
  const current = statusesFor(date)[name] || ''; const next = statusOrder[(statusOrder.indexOf(current) + 1) % statusOrder.length]; const currentRecord = recordFor(date); const attendance = { ...statusesFor(date), [name]: next };
  if (!next) delete attendance[name];
  records.value = { ...records.value, [date]: { ...currentRecord, attendance: Object.entries(attendance).map(([athleteId, value]) => ({ athleteId, status: value })) } }; markDirty();
}
function setAll(value) { const currentRecord = recordFor(selectedDate.value); records.value = { ...records.value, [selectedDate.value]: { ...currentRecord, attendance: activeGroup.value.names.map((athleteId) => ({ athleteId, status: value })) } }; markDirty(value === 'R' ? 'Pioggia impostata per la giornata selezionata.' : 'Tutti gli atleti risultano presenti.'); }
function addExtra() { extras.value = { ...extras.value, [selectedDate.value]: [...currentExtras.value, { name: '', type: 'Prova', status: 'P' }] }; extraPanelOpen.value = true; markDirty(); }
function updateExtra(index, field, value) { const changed = currentExtras.value.map((extra, itemIndex) => itemIndex === index ? { ...extra, [field]: value } : extra); extras.value = { ...extras.value, [selectedDate.value]: changed }; markDirty(); }
function removeExtra(index) { extras.value = { ...extras.value, [selectedDate.value]: currentExtras.value.filter((_, itemIndex) => itemIndex !== index) }; markDirty(); }
async function loadMonth() {
  if (!activeGroup.value) return; loading.value = true; status.value = 'Caricamento appelli del mese…';
  try {
    const responses = await Promise.all(sessionDates.value.map((date) => request(`/api/attendance?date=${encodeURIComponent(date)}&groupId=${encodeURIComponent(activeGroup.value.id)}`)));
    const nextRecords = {}; const nextExtras = {};
    responses.forEach((response, index) => { const date = sessionDates.value[index]; if (response.record) { nextRecords[date] = response.record; nextExtras[date] = response.record.extras || []; } });
    records.value = nextRecords; extras.value = nextExtras; selectedDate.value = sessionDates.value.includes(today) ? today : sessionDates.value[0] || ''; selectedStaff.value = [...(nextRecords[selectedDate.value]?.staff || [])]; status.value = Object.keys(nextRecords).length ? 'Appelli del mese caricati dall’archivio privato.' : 'Nessun appello ancora salvato per questo turno.';
  } catch (error) { status.value = error.message; } finally { loading.value = false; }
}
async function saveDay() {
  if (!selectedDate.value || !selectedStaff.value.length) { status.value = 'Seleziona almeno un membro dello staff prima di salvare.'; return; }
  if (currentExtras.value.some((extra) => !extra.name.trim())) { status.value = 'Completa o elimina i nominativi extra vuoti.'; return; }
  saving.value = true; status.value = 'Salvataggio sicuro in corso…'; const existing = recordFor(selectedDate.value);
  try {
    const payload = await request('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: selectedDate.value, groupId: activeGroup.value.id, staff: selectedStaff.value, attendance: statusesFor(selectedDate.value), extras: currentExtras.value, version: existing.version || null }) });
    records.value = { ...records.value, [selectedDate.value]: payload.record }; extras.value = { ...extras.value, [selectedDate.value]: payload.record.extras || [] }; dirty.value = false; status.value = '✓ Appello salvato nell’archivio privato.';
  } catch (error) { if (error.status === 409) { records.value = { ...records.value, [selectedDate.value]: error.current || recordFor(selectedDate.value) }; status.value = 'Un’altra modifica è stata salvata prima della tua: l’appello è stato ricaricato.'; } else status.value = error.message; } finally { saving.value = false; }
}
function downloadCsv() {
  const rows = [['Data', 'Turno', 'Staff', 'Atleta', 'Esito']];
  sessionDates.value.forEach((date) => { const record = recordFor(date); const map = statusesFor(date); activeGroup.value.names.forEach((name) => rows.push([date, activeGroup.value.label, (record.staff || []).join(', '), name, map[name] || ''])); (extras.value[date] || []).forEach((extra) => rows.push([date, activeGroup.value.label, (record.staff || []).join(', '), `${extra.name} (${extra.type})`, extra.status])); });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n'); const href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = href; link.download = `presenze-${activeGroup.value.id}-${year.value}-${pad(month.value)}.csv`; link.click(); URL.revokeObjectURL(href); status.value = 'Esportazione CSV scaricata sul dispositivo.';
}
async function loadConfig() { try { const payload = await request('/api/config'); groups.value = payload.groups; groupId.value = groups.value.find((group) => group.day === day.value)?.id || groups.value[0].id; } catch { status.value = 'Configurazione locale caricata. Verifica la connessione prima di salvare.'; } await loadMonth(); }
loadConfig();
</script>

<template>
  <main class="wrap">
    <section class="panel">
      <header class="head"><div class="brandlogo" aria-hidden="true">DS</div><div class="headtext"><strong>Registro presenze</strong><span class="sub">ASD Dancing Skating Club Roma</span></div><span class="private-badge">Archivio privato</span></header>
      <div class="days" role="group" aria-label="Seleziona giornata"><button v-for="item in days" :key="item.id" class="day" :class="{ active: day === item.id }" :disabled="loading || saving" @click="chooseDay(item.id)">{{ item.name }}<small>{{ item.place }}</small></button></div>
      <label>Orario e gruppo</label><div class="group-buttons" role="group" aria-label="Seleziona orario e gruppo"><button v-for="item in activeGroups" :key="item.id" class="group-button" :class="{ active: groupId === item.id }" :disabled="loading || saving" @click="chooseGroup(item.id)"><strong>{{ item.label.includes(' · ') ? item.label.split(' · ')[1] : item.label }}</strong><small>{{ item.venue }} · {{ item.names.length }} atleti</small></button></div>
      <label>Staff presente</label><div class="staff"><label v-for="name in activeGroup.coaches" :key="name" class="coach-check"><input type="checkbox" :checked="selectedStaff.includes(name)" :disabled="loading || saving" @change="toggleStaff(name)"><span>{{ name }}</span></label></div>
      <div class="months"><button v-for="value in [10, 11, 12]" :key="value" :class="{ active: month === value }" :disabled="loading || saving" @click="chooseMonth(value)">{{ monthNames[value - 10] }}</button></div>
    </section>
    <section class="panel">
      <div class="rowtitle"><b>{{ monthTitle }}</b><span class="legend">P presente · A assente · ☔ pioggia</span></div>
      <div class="scroll"><table><thead><tr><th>Atleta</th><th v-for="date in sessionDates" :key="date" :class="{ 'today-col': date === today, 'selected-col': date === selectedDate }"><button class="datebutton" @click="selectDate(date)">{{ Number(date.slice(-2)) }}/{{ pad(month) }}</button></th></tr></thead><tbody><tr v-for="name in activeGroup.names" :key="name"><td>{{ name }}</td><td v-for="date in sessionDates" :key="date" :class="{ 'today-col': date === today, 'selected-col': date === selectedDate }"><button class="attendance" :class="{ presente: statusesFor(date)[name] === 'P', assente: statusesFor(date)[name] === 'A', pioggia: statusesFor(date)[name] === 'R' }" :disabled="loading || saving" :aria-label="`Presenza di ${name} il ${date}`" @click="cycleAttendance(name, date)">{{ statusText[statusesFor(date)[name]] || '—' }}</button></td></tr></tbody></table></div>
      <div class="datepanel"><div class="compactline"><label for="date">Data da salvare</label><select id="date" :value="selectedDate" :disabled="loading || saving" @change="selectDate($event.target.value)"><option v-for="date in sessionDates" :key="date" :value="date">{{ new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`)) }}</option></select></div>
        <button class="tiny" type="button" @click="extraPanelOpen = !extraPanelOpen">＋ Atleti in prova / Recuperi <span>{{ extraPanelOpen ? '▴' : '▾' }}</span></button>
        <div v-if="extraPanelOpen" class="extras"><div v-for="(extra, index) in currentExtras" :key="index" class="extra"><input :value="extra.name" placeholder="Nome e cognome" aria-label="Nome extra" @input="updateExtra(index, 'name', $event.target.value)"><select :value="extra.type" aria-label="Tipo extra" @change="updateExtra(index, 'type', $event.target.value)"><option>Prova</option><option>Recupero</option></select><select :value="extra.status" aria-label="Esito extra" @change="updateExtra(index, 'status', $event.target.value)"><option value="P">P</option><option value="A">A</option><option value="R">☔</option></select><button class="tiny delete" type="button" aria-label="Rimuovi atleta extra" @click="removeExtra(index)">×</button></div><button class="tiny" type="button" @click="addExtra">＋ Aggiungi nome</button><p class="muted">I nominativi extra sono associati soltanto alla data e al turno selezionati.</p></div>
        <button class="tiny all-present" type="button" :disabled="loading || saving" @click="setAll('P')">✓ Tutti presenti (P)</button><button v-if="isEurDay" class="tiny rain" type="button" :disabled="loading || saving" @click="setAll('R')">☔ Pioggia giornata EUR</button><div class="exportbar"><button class="tiny exportbtn" type="button" :disabled="loading || saving" @click="downloadCsv">⬇ CSV: mese e turno</button></div><p class="status" role="status" aria-live="polite">{{ status }}</p><button class="save" type="button" :disabled="loading || saving" @click="saveDay">{{ saving ? 'Salvataggio…' : 'Salva appello della data selezionata' }}</button>
      </div>
    </section>
  </main>
</template>
