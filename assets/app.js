(() => {
  const { createApp, computed, ref } = window.Vue;
  const fallbackGroups = [
    { id: 'base', label: 'Lunedì · Gruppo base', coaches: ['Allenatore 1'], names: ['Atleta 01', 'Atleta 02', 'Atleta 03'] },
    { id: 'intermediate', label: 'Mercoledì · Gruppo intermedio', coaches: ['Allenatore 1', 'Allenatore 2'], names: ['Atleta 02', 'Atleta 04', 'Atleta 05'] },
    { id: 'advanced', label: 'Sabato · Gruppo avanzato', coaches: ['Allenatore 2'], names: ['Atleta 01', 'Atleta 03', 'Atleta 06'] }
  ];
  const italyToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
  createApp({
    setup() {
      const groups = ref(fallbackGroups), date = ref(italyToday()), groupId = ref(fallbackGroups[0].id), coach = ref(fallbackGroups[0].coaches[0]), attendance = ref({}), message = ref('Caricamento archivio privato…'), version = ref(null), loading = ref(true), saving = ref(false);
      const statuses = [{ value: 'P', label: 'P', className: 'is-present' }, { value: 'A', label: 'A', className: 'is-absent' }, { value: 'R', label: 'R', className: 'is-rain' }];
      const activeGroup = computed(() => groups.value.find((group) => group.id === groupId.value) || groups.value[0]);
      const formattedDate = computed(() => new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date.value}T12:00:00`)));
      async function request(url, options) { const response = await fetch(url, { credentials: 'same-origin', ...options }); const payload = await response.json().catch(() => ({})); if (!response.ok) { const error = new Error(payload.error || 'Operazione non riuscita.'); error.status = response.status; error.current = payload.current; throw error; } return payload; }
      function applyRecord(record) { attendance.value = Object.fromEntries((record?.attendance || []).map((entry) => [entry.athleteId, entry.status])); version.value = record?.version || null; coach.value = activeGroup.value.coaches.includes(record?.coach) ? record.coach : activeGroup.value.coaches[0]; }
      async function loadAttendance() { loading.value = true; message.value = 'Caricamento appello…'; try { const payload = await request(`/api/attendance?date=${encodeURIComponent(date.value)}&groupId=${encodeURIComponent(groupId.value)}`); applyRecord(payload.record); message.value = payload.record ? 'Appello caricato dall’archivio privato.' : 'Nessun appello salvato per questa data.'; } catch (error) { message.value = error.status === 401 || error.status === 403 ? 'Accesso non autorizzato.' : error.message; } finally { loading.value = false; } }
      async function loadConfig() { try { const payload = await request('/api/config'); groups.value = payload.groups; if (!groups.value.some((group) => group.id === groupId.value)) groupId.value = groups.value[0].id; coach.value = activeGroup.value.coaches[0]; } catch (error) { message.value = error.message; } await loadAttendance(); }
      function changeGroup() { coach.value = activeGroup.value.coaches[0]; loadAttendance(); }
      function setStatus(name, value) { attendance.value = { ...attendance.value, [name]: attendance.value[name] === value ? undefined : value }; message.value = 'Modifica non ancora salvata.'; }
      function markAll(value) { attendance.value = Object.fromEntries(activeGroup.value.names.map((name) => [name, value])); message.value = 'Tutti gli atleti sono stati aggiornati.'; }
      function clearAll() { attendance.value = {}; message.value = 'Appello azzerato.'; }
      async function saveAttendance() { saving.value = true; message.value = 'Salvataggio sicuro in corso…'; try { const payload = await request('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: date.value, groupId: groupId.value, coach: coach.value, attendance: attendance.value, version: version.value }) }); applyRecord(payload.record); message.value = 'Appello salvato nell’archivio privato.'; } catch (error) { if (error.status === 409) { applyRecord(error.current); message.value = 'Un’altra modifica è stata salvata prima della tua: ho ricaricato l’appello aggiornato.'; } else message.value = error.message; } finally { saving.value = false; } }
      function exportCsv() { const rows = [['Data', 'Gruppo', 'Allenatore', 'Atleta', 'Esito'], ...activeGroup.value.names.map((name) => [date.value, activeGroup.value.label, coach.value, name, attendance.value[name] || ''])]; const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `presenze-${date.value}.csv`; link.click(); URL.revokeObjectURL(url); message.value = 'CSV scaricato sul dispositivo.'; }
      loadConfig();
      return { groups, date, groupId, coach, activeGroup, attendance, message, statuses, formattedDate, loading, saving, setStatus, markAll, clearAll, saveAttendance, exportCsv, changeGroup, loadAttendance };
    }
  }).mount('#app');
})();
