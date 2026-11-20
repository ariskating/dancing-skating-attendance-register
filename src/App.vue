<script setup>
import { computed, ref } from 'vue';

const fallbackGroups = [
  { id: 'base', label: 'Lunedì · Gruppo base', coaches: ['Allenatore 1'], names: ['Atleta 01', 'Atleta 02', 'Atleta 03'] },
  { id: 'intermediate', label: 'Mercoledì · Gruppo intermedio', coaches: ['Allenatore 1', 'Allenatore 2'], names: ['Atleta 02', 'Atleta 04', 'Atleta 05'] },
  { id: 'advanced', label: 'Sabato · Gruppo avanzato', coaches: ['Allenatore 2'], names: ['Atleta 01', 'Atleta 03', 'Atleta 06'] },
];
const statuses = [{ value: 'P', label: 'P', className: 'is-present' }, { value: 'A', label: 'A', className: 'is-absent' }, { value: 'R', label: 'R', className: 'is-rain' }];
const italyToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
const groups = ref(fallbackGroups);
const date = ref(italyToday());
const groupId = ref(fallbackGroups[0].id);
const coach = ref(fallbackGroups[0].coaches[0]);
const attendance = ref({});
const message = ref('Caricamento archivio privato…');
const version = ref(null);
const loading = ref(true);
const saving = ref(false);
const activeGroup = computed(() => groups.value.find((group) => group.id === groupId.value) || groups.value[0]);
const formattedDate = computed(() => new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date.value}T12:00:00`)));

async function request(url, options) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || 'Operazione non riuscita.');
    error.status = response.status;
    error.current = payload.current;
    throw error;
  }
  return payload;
}
function applyRecord(record) {
  attendance.value = Object.fromEntries((record?.attendance || []).map((entry) => [entry.athleteId, entry.status]));
  version.value = record?.version || null;
  coach.value = activeGroup.value.coaches.includes(record?.coach) ? record.coach : activeGroup.value.coaches[0];
}
async function loadAttendance() {
  loading.value = true;
  message.value = 'Caricamento appello…';
  try {
    const payload = await request(`/api/attendance?date=${encodeURIComponent(date.value)}&groupId=${encodeURIComponent(groupId.value)}`);
    applyRecord(payload.record);
    message.value = payload.record ? 'Appello caricato dall’archivio privato.' : 'Nessun appello salvato per questa data.';
  } catch (error) {
    message.value = error.status === 401 || error.status === 403 ? 'Accesso non autorizzato.' : error.message;
  } finally { loading.value = false; }
}
async function loadConfig() {
  try {
    const payload = await request('/api/config');
    groups.value = payload.groups;
    if (!groups.value.some((group) => group.id === groupId.value)) groupId.value = groups.value[0].id;
    coach.value = activeGroup.value.coaches[0];
  } catch (error) { message.value = error.message; }
  await loadAttendance();
}
function changeGroup() { coach.value = activeGroup.value.coaches[0]; loadAttendance(); }
function setStatus(name, value) { attendance.value = { ...attendance.value, [name]: attendance.value[name] === value ? undefined : value }; message.value = 'Modifica non ancora salvata.'; }
function markAll(value) { attendance.value = Object.fromEntries(activeGroup.value.names.map((name) => [name, value])); message.value = 'Tutti gli atleti sono stati aggiornati.'; }
function clearAll() { attendance.value = {}; message.value = 'Appello azzerato.'; }
async function saveAttendance() {
  saving.value = true;
  message.value = 'Salvataggio sicuro in corso…';
  try {
    const payload = await request('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: date.value, groupId: groupId.value, coach: coach.value, attendance: attendance.value, version: version.value }) });
    applyRecord(payload.record);
    message.value = 'Appello salvato nell’archivio privato.';
  } catch (error) {
    if (error.status === 409) { applyRecord(error.current); message.value = 'Un’altra modifica è stata salvata prima della tua: ho ricaricato l’appello aggiornato.'; }
    else message.value = error.message;
  } finally { saving.value = false; }
}
function exportCsv() {
  const rows = [['Data', 'Gruppo', 'Allenatore', 'Atleta', 'Esito'], ...activeGroup.value.names.map((name) => [date.value, activeGroup.value.label, coach.value, name, attendance.value[name] || ''])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `presenze-${date.value}.csv`; link.click(); URL.revokeObjectURL(url);
  message.value = 'CSV scaricato sul dispositivo.';
}
loadConfig();
</script>

<template>
  <main class="shell">
    <header class="masthead"><div><p class="eyebrow">Dancing · registro digitale</p><h1>Appello, senza frizione.</h1><p class="lede">Una schermata rapida per registrare la presenza, con archivio privato e controllo delle modifiche concorrenti.</p></div><div class="privacy-note" aria-label="Indicatore privacy"><span class="lock" aria-hidden="true">⌁</span><span>Archivio privato<br><strong>Accesso protetto</strong></span></div></header>
    <section class="panel setup" aria-labelledby="session-title"><div class="section-heading"><p class="eyebrow">01 · Sessione</p><h2 id="session-title">Imposta l’allenamento</h2></div><div class="fields"><label>Data<input v-model="date" type="date" :disabled="loading || saving" @change="loadAttendance"></label><label>Gruppo<select v-model="groupId" :disabled="loading || saving" @change="changeGroup"><option v-for="group in groups" :key="group.id" :value="group.id">{{ group.label }}</option></select></label><label>Allenatore<select v-model="coach"><option v-for="name in activeGroup.coaches" :key="name">{{ name }}</option></select></label></div></section>
    <section class="panel attendance" aria-labelledby="attendance-title"><div class="attendance-head"><div><p class="eyebrow">02 · Appello</p><h2 id="attendance-title">{{ formattedDate }}</h2><p class="muted">{{ activeGroup.label }} · {{ activeGroup.names.length }} atleti</p></div><div class="legend" aria-label="Legenda"><span><i class="dot present"></i>Presente</span><span><i class="dot absent"></i>Assente</span><span><i class="dot rain"></i>Pioggia</span></div></div><div class="quick-actions" aria-label="Azioni rapide"><button class="subtle" type="button" @click="markAll('P')">Tutti presenti</button><button class="subtle" type="button" @click="clearAll">Azzera</button></div><div class="roster" role="list" aria-label="Elenco atleti"><article v-for="name in activeGroup.names" :key="name" class="athlete" role="listitem"><span class="athlete-name">{{ name }}</span><div class="status-controls" :aria-label="`Esito per ${name}`"><button v-for="status in statuses" :key="status.value" type="button" class="status-button" :class="[status.className, { selected: attendance[name] === status.value }]" :aria-pressed="attendance[name] === status.value" @click="setStatus(name, status.value)">{{ status.label }}</button></div></article></div><footer class="save-bar"><p id="status-message" class="status-message" role="status" aria-live="polite">{{ message }}</p><div class="save-actions"><button class="subtle" type="button" @click="exportCsv">Scarica CSV</button><button class="primary" type="button" :disabled="loading || saving" @click="saveAttendance">{{ saving ? 'Salvataggio…' : 'Salva in archivio' }}</button></div></footer></section>
  </main>
</template>
