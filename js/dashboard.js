const TASKS_KEY = 'studyflow_tasks';

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

function renderDashboard() {
  const tasks = window.StudyFlowStorage.read(TASKS_KEY);
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const completed = safeTasks.filter((task) => task && task.completed === true).length;
  const pending = safeTasks.length - completed;
  const rate = safeTasks.length ? Math.round((completed / safeTasks.length) * 100) : 0;
  const today = new Date();

  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(today);
  document.querySelector('#pending-count').textContent = pending;
  document.querySelector('#completed-count').textContent = completed;
  document.querySelector('#completion-rate').textContent = `${rate}%`;
  document.querySelector('#progress-note').textContent = safeTasks.length
    ? `${completed} trên ${safeTasks.length} bài tập đã hoàn thành`
    : 'Thêm bài tập đầu tiên để bắt đầu.';

  const progress = document.querySelector('#completion-progress');
  progress.setAttribute('aria-valuenow', rate);
  progress.querySelector('span').style.width = `${rate}%`;
  renderDeadlines(safeTasks, today);
}

renderDashboard();
