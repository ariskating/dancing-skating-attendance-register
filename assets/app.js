(() => {
  const { createApp, computed, ref } = window.Vue;
  const sessionPrefix = 'dancing-attendance:v1:';
  const groups = [
    { id: 'base', label: 'Lunedì · Gruppo base', coaches: ['Allenatore 1'], names: ['Atleta 01', 'Atleta 02', 'Atleta 03'] },
    { id: 'intermediate', label: 'Mercoledì · Gruppo intermedio', coaches: ['Allenatore 1', 'Allenatore 2'], names: ['Atleta 02', 'Atleta 04', 'Atleta 05'] },
    { id: 'advanced', label: 'Sabato · Gruppo avanzato', coaches: ['Allenatore 2'], names: ['Atleta 01', 'Atleta 03', 'Atleta 06'] }
  ];
  const italyToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
  createApp({
    setup() {
      const date = ref(italyToday()), groupId = ref(groups[0].id), coach = ref(groups[0].coaches[0]), attendance = ref({}), message = ref('Pronto per l’appello.');
      const statuses = [{ value: 'P', label: 'P', className: 'is-present' }, { value: 'A', label: 'A', className: 'is-absent' }, { value: 'R', label: 'R', className: 'is-rain' }];
      const activeGroup = computed(() => groups.find((group) => group.id === groupId.value));
      const formattedDate = computed(() => new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date.value}T12:00:00`)));
      const storageKey = () => `${sessionPrefix}${date.value}:${groupId.value}`;
      function loadSession() { try { const saved = JSON.parse(sessionStorage.getItem(storageKey()) || 'null'); attendance.value = saved?.attendance || {}; coach.value = activeGroup.value.coaches.includes(saved?.coach) ? saved.coach : activeGroup.value.coaches[0]; message.value = saved ? 'Appello della sessione ripristinato.' : 'Pronto per l’appello.'; } catch { attendance.value = {}; message.value = 'Impossibile ripristinare la sessione: riparti da un appello vuoto.'; } }
      function changeGroup() { coach.value = activeGroup.value.coaches[0]; loadSession(); }
      function restoreSession() { loadSession(); }
      function setStatus(name, value) { attendance.value = { ...attendance.value, [name]: attendance.value[name] === value ? undefined : value }; message.value = 'Modifica non ancora salvata nella sessione.'; }
      function markAll(value) { attendance.value = Object.fromEntries(activeGroup.value.names.map((name) => [name, value])); message.value = 'Tutti gli atleti sono stati aggiornati.'; }
      function clearAll() { attendance.value = {}; message.value = 'Appello azzerato.'; }
      function saveSession() { sessionStorage.setItem(storageKey(), JSON.stringify({ coach: coach.value, attendance: attendance.value })); message.value = 'Appello salvato per questa sessione del browser.'; }
      function exportCsv() { const rows = [['Data', 'Gruppo', 'Allenatore', 'Atleta', 'Esito'], ...activeGroup.value.names.map((name) => [date.value, activeGroup.value.label, coach.value, name, attendance.value[name] || ''])]; const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `presenze-${date.value}.csv`; link.click(); URL.revokeObjectURL(url); message.value = 'CSV scaricato sul dispositivo.'; }
      loadSession();
      return { groups, date, groupId, coach, activeGroup, attendance, message, statuses, formattedDate, setStatus, markAll, clearAll, saveSession, exportCsv, changeGroup, restoreSession };
    }
  }).mount('#app');
})();
