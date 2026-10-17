const TASKS_KEY = 'studyflow_tasks';
const EVENTS_KEY = 'studyflow_events';
const SESSIONS_KEY = 'studyflow_sessions';

function localDateFromValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function dayDistance(from, to) {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / 86400000);
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function deadlineLabel(days) {
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) return 'Hạn hôm nay';
  if (days === 1) return 'Hạn ngày mai';
  return `Còn ${days} ngày`;
}

function createDeadlineItem(task, dueDate, days) {
  const item = document.createElement('li');
  item.className = 'deadline-item';

  const date = document.createElement('span');
  date.className = `deadline-date${days <= 1 ? ' deadline-date--urgent' : ''}`;
  date.textContent = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short' }).format(dueDate);

  const copy = document.createElement('div');
  copy.className = 'deadline-copy';
  const title = document.createElement('p');
  title.className = 'deadline-title';
  title.textContent = task.title || 'Bài tập chưa có tiêu đề';
  const subtitle = document.createElement('p');
  subtitle.className = 'deadline-subtitle';
  subtitle.textContent = task.subject || 'Chưa phân loại môn học';
  copy.append(title, subtitle);

  const badge = document.createElement('span');
  badge.className = `deadline-badge${days <= 1 ? ' deadline-badge--urgent' : ''}`;
  badge.textContent = deadlineLabel(days);
  item.append(date, copy, badge);
  return item;
}

function renderDeadlines(tasks, today) {
  const list = document.querySelector('#deadline-list');
  const deadlines = tasks
    .filter((task) => task && task.completed !== true)
    .map((task) => ({ task, date: localDateFromValue(task.dueDate) }))
    .filter((entry) => entry.date)
    .map((entry) => ({ ...entry, days: dayDistance(today, entry.date) }))
    .sort((a, b) => Math.abs(a.days) - Math.abs(b.days) || a.date - b.date)
    .slice(0, 5);

  if (deadlines.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'deadline-empty';
    const title = document.createElement('strong');
    title.textContent = tasks.length === 0 ? 'Chưa có bài tập nào' : 'Chưa có deadline cần theo dõi';
    const note = document.createElement('span');
    note.textContent = tasks.length === 0
      ? 'Thêm bài tập đầu tiên để theo dõi hạn nộp tại đây.'
      : 'Bài tập chưa hoàn thành có deadline sẽ xuất hiện ở đây.';
    empty.append(title, note);
    list.append(empty);
    return;
  }

  deadlines.forEach(({ task, date, days }) => list.append(createDeadlineItem(task, date, days)));
}

function renderTodayEvents(events, today) {
  const list = document.querySelector('#today-event-list');
  const todaysEvents = events
    .filter((event) => event && event.date === localDateKey(today))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  document.querySelector('#today-event-count').textContent = todaysEvents.length;

  if (todaysEvents.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'deadline-empty';
    const title = document.createElement('strong');
    title.textContent = 'Hôm nay chưa có lịch học';
    const note = document.createElement('span');
    note.textContent = 'Thêm sự kiện trong Lịch học để xem tại đây.';
    empty.append(title, note);
    list.append(empty);
    return;
  }

  todaysEvents.forEach((event) => {
    const item = document.createElement('li');
    item.className = 'today-event-item';
    const time = document.createElement('time');
    time.className = 'today-event-time';
    time.textContent = event.time || 'Cả ngày';
    if (event.time) time.dateTime = event.time;
    const copy = document.createElement('div');
    copy.className = 'deadline-copy';
    const title = document.createElement('p');
    title.className = 'deadline-title';
    title.textContent = event.title || 'Buổi học';
    const detail = document.createElement('p');
    detail.className = 'deadline-subtitle';
    detail.textContent = [event.subject, event.location].filter(Boolean).join(' · ') || 'Sự kiện học tập';
    copy.append(title, detail);
    item.append(time, copy);
    list.append(item);
  });
}

function renderDashboard() {
  const tasks = window.StudyFlowStorage.read(TASKS_KEY);
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const storedEvents = window.StudyFlowStorage.read(EVENTS_KEY);
  const events = Array.isArray(storedEvents) ? storedEvents : [];
  const storedSessions = window.StudyFlowStorage.read(SESSIONS_KEY);
  const sessions = Array.isArray(storedSessions) ? storedSessions : [];
  const completed = safeTasks.filter((task) => task && task.completed === true).length;
  const pending = safeTasks.length - completed;
  const rate = safeTasks.length ? Math.round((completed / safeTasks.length) * 100) : 0;
  const today = new Date();
  const todayKey = localDateKey(today);
  const focusMinutes = sessions.reduce((total, session) => {
    if (!session || typeof session.completedAt !== 'string') return total;
    const completedAt = new Date(session.completedAt);
    return Number.isFinite(session.durationMinutes) && session.durationMinutes > 0
      && !Number.isNaN(completedAt.getTime()) && localDateKey(completedAt) === todayKey
      ? total + session.durationMinutes
      : total;
  }, 0);

  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(today);
  document.querySelector('#pending-count').textContent = pending;
  document.querySelector('#completed-count').textContent = completed;
  document.querySelector('#focus-minutes').textContent = focusMinutes;
  document.querySelector('#progress-note').textContent = safeTasks.length
    ? `${rate}% tổng số bài tập`
    : 'Thêm bài tập để theo dõi tiến độ.';

  const progress = document.querySelector('#completion-progress');
  progress.setAttribute('aria-valuenow', rate);
  progress.querySelector('span').style.width = `${rate}%`;
  renderDeadlines(safeTasks, today);
  renderTodayEvents(events, today);
}

renderDashboard();
