(() => {
  const EVENTS_KEY = 'studyflow_events';
  const TASKS_KEY = 'studyflow_tasks';
  const grid = document.querySelector('#calendar-grid');
  const monthLabel = document.querySelector('#month-label');
  const agendaTitle = document.querySelector('#agenda-title');
  const agendaList = document.querySelector('#agenda-list');
  const agendaEmpty = document.querySelector('#agenda-empty');
  const form = document.querySelector('#event-form');
  const feedback = document.querySelector('#event-feedback');
  const dateInput = document.querySelector('#event-date');
  let cursor = new Date();
  let selected = keyOf(new Date());
  let events = read(EVENTS_KEY);
  let tasks = read(TASKS_KEY);

  function read(key) {
    const value = window.StudyFlowStorage.read(key);
    return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === 'object') : [];
  }

  function keyOf(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  function dateLabel(value, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
    if (!validDate(value)) return value;
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('vi-VN', options).format(new Date(year, month - 1, day));
  }

  function monthEntries() {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = (first.getDay() + 6) % 7;
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const count = Math.ceil((start + days) / 7) * 7;
    return Array.from({ length: count }, (_, index) => new Date(first.getFullYear(), first.getMonth(), index - start + 1));
  }

  function renderCalendar() {
    monthLabel.textContent = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(cursor);
    grid.replaceChildren();
    const dates = monthEntries();
    grid.classList.toggle('is-six-week', dates.length > 35);
    dates.forEach((date) => {
      const dateKey = keyOf(date);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'calendar-day';
      if (date.getMonth() !== cursor.getMonth()) cell.classList.add('is-outside');
      if (dateKey === keyOf(new Date())) cell.classList.add('is-today');
      if (dateKey === selected) cell.classList.add('is-selected');
      cell.setAttribute('aria-label', dateLabel(dateKey));
      if (dateKey === keyOf(new Date())) cell.setAttribute('aria-current', 'date');
      const number = document.createElement('span');
      number.className = 'calendar-day-number';
      number.textContent = String(date.getDate());
      cell.append(number);
      const markers = document.createElement('span');
      markers.className = 'day-markers';
      const hasEvent = events.some((event) => event.date === dateKey);
      const hasDeadline = tasks.some((task) => task.completed !== true && task.dueDate === dateKey);
      if (hasEvent) { const marker = document.createElement('i'); marker.className = 'day-marker'; marker.setAttribute('aria-hidden', 'true'); markers.append(marker); }
      if (hasDeadline) { const marker = document.createElement('i'); marker.className = 'day-marker deadline-marker'; marker.setAttribute('aria-hidden', 'true'); markers.append(marker); }
      cell.append(markers);
      cell.addEventListener('click', () => {
        selected = dateKey;
        if (date.getMonth() !== cursor.getMonth()) cursor = new Date(date.getFullYear(), date.getMonth(), 1);
        dateInput.value = dateKey;
        renderCalendar(); renderAgenda();
      });
      grid.append(cell);
    });
  }

  function renderAgenda() {
    agendaTitle.textContent = dateLabel(selected);
    agendaList.replaceChildren();
    const items = [
      ...events.filter((event) => event.date === selected).map((event) => ({ kind: 'event', value: event })),
      ...tasks.filter((task) => task.completed !== true && task.dueDate === selected).map((task) => ({ kind: 'deadline', value: task })),
    ].sort((a, b) => (a.value.time || '99:99').localeCompare(b.value.time || '99:99'));
    agendaEmpty.hidden = items.length > 0;
    items.forEach(({ kind, value }) => {
      const item = document.createElement('li');
      item.className = 'agenda-item';
      const time = document.createElement('span');
      time.className = 'agenda-time';
      time.textContent = kind === 'event' ? value.time || 'Cả ngày' : 'Deadline';
      const copy = document.createElement('span');
      copy.className = 'agenda-copy';
      const title = document.createElement('strong');
      title.textContent = value.title || (kind === 'event' ? 'Buổi học' : 'Bài tập');
      const detail = document.createElement('span');
      detail.textContent = [value.subject, kind === 'event' ? value.location : ''].filter(Boolean).join(' · ') || (kind === 'event' ? 'Sự kiện học tập' : 'Bài tập cần hoàn thành');
      copy.append(title, detail);
      const actions = document.createElement('span');
      actions.className = 'agenda-actions';
      if (kind === 'event') {
        const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Sửa'; edit.setAttribute('aria-label', `Sửa ${value.title}`); edit.addEventListener('click', () => beginEdit(value));
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Xóa'; remove.setAttribute('aria-label', `Xóa ${value.title}`); remove.addEventListener('click', () => removeEvent(value));
        actions.append(edit, remove);
      }
      const kindLabel = document.createElement('span'); kindLabel.className = 'agenda-kind'; kindLabel.textContent = kind === 'event' ? 'Buổi học' : 'Bài tập';
      item.append(time, copy, actions, kindLabel);
      agendaList.append(item);
    });
  }

  function resetForm() {
    form.reset();
    document.querySelector('#event-id').value = '';
    dateInput.value = selected;
    document.querySelector('#event-form-title').textContent = 'Thêm buổi học';
    document.querySelector('#event-submit').textContent = 'Thêm vào lịch';
    document.querySelector('#event-cancel').hidden = true;
    feedback.textContent = '';
  }

  function beginEdit(event) {
    document.querySelector('#event-id').value = event.id;
    document.querySelector('#event-title').value = event.title || '';
    document.querySelector('#event-subject').value = event.subject || '';
    dateInput.value = event.date;
    document.querySelector('#event-time').value = event.time || '';
    document.querySelector('#event-location').value = event.location || '';
    document.querySelector('#event-form-title').textContent = 'Chỉnh sửa buổi học';
    document.querySelector('#event-submit').textContent = 'Lưu thay đổi';
    document.querySelector('#event-cancel').hidden = false;
    document.querySelector('#event-title').focus();
  }

  function persist(nextEvents) {
    try {
      window.StudyFlowStorage.write(EVENTS_KEY, nextEvents);
      events = nextEvents;
      feedback.textContent = '';
      renderCalendar(); renderAgenda();
      return true;
    } catch {
      feedback.textContent = 'Không lưu được. Hãy kiểm tra dung lượng lưu trữ của trình duyệt.';
      return false;
    }
  }

  function removeEvent(event) {
    if (window.confirm(`Xóa sự kiện “${event.title || 'chưa có tên'}”?`)) persist(events.filter((entry) => entry.id !== event.id));
  }

  document.querySelector('#previous-month').addEventListener('click', () => { cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1); renderCalendar(); });
  document.querySelector('#next-month').addEventListener('click', () => { cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1); renderCalendar(); });
  document.querySelector('#today-button').addEventListener('click', () => { const today = new Date(); cursor = new Date(today.getFullYear(), today.getMonth(), 1); selected = keyOf(today); dateInput.value = selected; renderCalendar(); renderAgenda(); });
  document.querySelector('#event-cancel').addEventListener('click', resetForm);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = document.querySelector('#event-title').value.trim();
    const date = dateInput.value;
    if (!title || !validDate(date)) { feedback.textContent = 'Nhập tên sự kiện và ngày hợp lệ.'; return; }
    const id = document.querySelector('#event-id').value || `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry = { id, title, subject: document.querySelector('#event-subject').value.trim(), date, time: document.querySelector('#event-time').value, location: document.querySelector('#event-location').value.trim() };
    const nextEvents = events.some((item) => item.id === id) ? events.map((item) => item.id === id ? entry : item) : [...events, entry];
    selected = date;
    cursor = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, 1);
    if (persist(nextEvents)) resetForm();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === EVENTS_KEY || event.key === TASKS_KEY) { events = read(EVENTS_KEY); tasks = read(TASKS_KEY); renderCalendar(); renderAgenda(); }
  });
  resetForm(); renderCalendar(); renderAgenda();
})();
