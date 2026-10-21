// Chức năng Thống kê – thành viên 5 (Vũ Trường Giang)
(() => {
  const KEYS = { tasks: 'studyflow_tasks', sessions: 'studyflow_sessions', goals: 'studyflow_goals' };
  const GOAL_TYPES = ['weekly-minutes', 'daily-minutes', 'completed-tasks'];
  const SUBJECT_COLORS = ['#3a8fe0', '#7c6cf0', '#2fa59a', '#d48a2c', '#df6f8b', '#4f9d5b', '#8a6fd1', '#c0703a'];
  const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const NO_SUBJECT = 'Chưa phân môn';
  const $ = (selector) => document.querySelector(selector);
  const numberFormat = new Intl.NumberFormat('vi-VN');
  const shortDate = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' });

  const goalForm = $('#goal-form');
  const goalType = $('#goal-type');
  const goalTarget = $('#goal-target');
  const goalSubject = $('#goal-subject');
  const goalFeedback = $('#goal-feedback');
  const subjectSort = $('#subject-sort');
  const metricButtons = document.querySelectorAll('.segmented-button');
  let chartMetric = 'minutes';
  let data = loadData();

  /* ---------- Đọc và chuẩn hóa dữ liệu ---------- */

  function readArray(key) {
    const stored = window.StudyFlowStorage.read(key);
    return Array.isArray(stored) ? stored.filter((entry) => entry && typeof entry === 'object') : [];
  }

  function cleanSubject(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function subjectKey(value) {
    return cleanSubject(value).toLocaleLowerCase('vi');
  }

  function localDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  function addDays(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function loadData() {
    const tasks = readArray(KEYS.tasks);
    const sessions = readArray(KEYS.sessions)
      .map((session) => {
        const completedAt = typeof session.completedAt === 'string' ? new Date(session.completedAt) : null;
        const minutes = Number(session.durationMinutes);
        if (!completedAt || Number.isNaN(completedAt.getTime()) || !Number.isFinite(minutes) || minutes <= 0) return null;
        return { subject: cleanSubject(session.subject), minutes, day: dateKey(completedAt), completedAt };
      })
      .filter(Boolean);
    const goals = readArray(KEYS.goals).filter((goal) => typeof goal.id === 'string'
      && GOAL_TYPES.includes(goal.type) && Number.isInteger(goal.target) && goal.target > 0);
    return { tasks, sessions, goals };
  }

  /* ---------- Định dạng ---------- */

  function formatDuration(minutes) {
    const total = Math.round(minutes);
    if (total < 60) return `${numberFormat.format(total)} phút`;
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest ? `${numberFormat.format(hours)} giờ ${rest} phút` : `${numberFormat.format(hours)} giờ`;
  }

  function percent(part, whole) {
    return whole > 0 ? Math.round((part / whole) * 100) : 0;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function progressBar(value, label) {
    const track = el('div', 'progress-track');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', String(value));
    track.setAttribute('aria-label', label);
    const fill = el('span', 'progress-fill');
    fill.style.width = `${value}%`;
    track.append(fill);
    return track;
  }

  function emptyState(title, message, link) {
    const item = el('li', 'analytics-empty');
    item.append(el('strong', '', title), el('span', '', message));
    if (link) {
      const anchor = el('a', '', link.text);
      anchor.href = link.href;
      item.append(document.createTextNode(' '), anchor);
    }
    return item;
  }

  /* ---------- Tính toán ---------- */

  function lastSevenDays(today) {
    const start = addDays(startOfDay(today), -6);
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      const key = dateKey(date);
      const daySessions = data.sessions.filter((session) => session.day === key);
      return {
        date,
        key,
        minutes: daySessions.reduce((sum, session) => sum + session.minutes, 0),
        sessions: daySessions.length,
        isToday: index === 6,
      };
    });
  }

  function taskBreakdown(today) {
    const todayStart = startOfDay(today);
    let completed = 0;
    let overdue = 0;
    data.tasks.forEach((task) => {
      if (task.completed === true) completed += 1;
      else {
        const due = localDate(task.dueDate);
        if (due && due < todayStart) overdue += 1;
      }
    });
    return { total: data.tasks.length, completed, overdue, pending: data.tasks.length - completed - overdue };
  }

  function subjectStats() {
    const map = new Map();
    const entry = (subject) => {
      const name = cleanSubject(subject) || NO_SUBJECT;
      const key = subjectKey(name);
      if (!map.has(key)) map.set(key, { name, total: 0, completed: 0, minutes: 0, sessions: 0 });
      return map.get(key);
    };
    data.tasks.forEach((task) => {
      const item = entry(task.subject);
      item.total += 1;
      if (task.completed === true) item.completed += 1;
    });
    data.sessions.forEach((session) => {
      const item = entry(session.subject);
      item.minutes += session.minutes;
      item.sessions += 1;
    });
    return [...map.values()];
  }

  function weekStart(today) {
    const start = startOfDay(today);
    const offset = (start.getDay() + 6) % 7; // Tuần bắt đầu từ thứ Hai.
    return addDays(start, -offset);
  }

  function goalProgress(goal, today) {
    const matchSubject = (value) => !goal.subject || subjectKey(value) === subjectKey(goal.subject);
    if (goal.type === 'completed-tasks') {
      return data.tasks.filter((task) => task.completed === true && matchSubject(task.subject)).length;
    }
    const from = goal.type === 'weekly-minutes' ? weekStart(today) : startOfDay(today);
    const to = goal.type === 'weekly-minutes' ? addDays(from, 7) : addDays(from, 1);
    return data.sessions
      .filter((session) => session.completedAt >= from && session.completedAt < to && matchSubject(session.subject))
      .reduce((sum, session) => sum + session.minutes, 0);
  }

  function goalTitle(goal) {
    const base = {
      'weekly-minutes': `Học ${numberFormat.format(goal.target)} phút trong tuần`,
      'daily-minutes': `Học ${numberFormat.format(goal.target)} phút hôm nay`,
      'completed-tasks': `Hoàn thành ${numberFormat.format(goal.target)} bài tập`,
    }[goal.type];
    return goal.subject ? `${base} · ${goal.subject}` : base;
  }

  /* ---------- Hiển thị ---------- */

  function renderStats(days, breakdown) {
    const totalMinutes = data.sessions.reduce((sum, session) => sum + session.minutes, 0);
    const weekMinutes = days.reduce((sum, day) => sum + day.minutes, 0);
    const activeDays = days.filter((day) => day.sessions > 0).length;
    const rate = percent(breakdown.completed, breakdown.total);

    $('#stat-completed').textContent = numberFormat.format(breakdown.completed);
    $('#stat-total').textContent = ` / ${numberFormat.format(breakdown.total)}`;
    $('#stat-completed-note').textContent = breakdown.total ? `${rate}% tổng số bài tập` : 'Chưa có bài tập';
    $('#stat-total-minutes').textContent = formatDuration(totalMinutes);
    $('#stat-session-note').textContent = `${numberFormat.format(data.sessions.length)} phiên tập trung`;
    $('#stat-week-minutes').textContent = formatDuration(weekMinutes);
    $('#stat-week-note').textContent = `Trung bình ${numberFormat.format(Math.round(weekMinutes / 7))} phút/ngày`;
    $('#stat-active-days').textContent = String(activeDays);
    $('#stat-active-note').textContent = activeDays === 0
      ? 'Hãy bắt đầu phiên đầu tiên'
      : activeDays === 7 ? 'Học đều mỗi ngày, tuyệt vời!' : `Còn ${7 - activeDays} ngày chưa học`;
  }

  function renderChart(days) {
    const chart = $('#week-chart');
    const labels = $('#week-chart-labels');
    const values = days.map((day) => (chartMetric === 'minutes' ? day.minutes : day.sessions));
    const max = Math.max(...values, 0);
    const unit = chartMetric === 'minutes' ? 'phút' : 'phiên';
    chart.replaceChildren();
    labels.replaceChildren();

    days.forEach((day, index) => {
      const value = values[index];
      const item = el('li', `week-chart-item${value === 0 ? ' is-empty' : ''}${day.isToday ? ' is-today' : ''}`);
      const fullDate = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' }).format(day.date);
      item.setAttribute('aria-label', `${day.isToday ? 'Hôm nay, ' : ''}${fullDate}: ${numberFormat.format(Math.round(value))} ${unit}`);
      item.title = `${fullDate}: ${numberFormat.format(Math.round(value))} ${unit}`;
      const bar = el('span', 'week-chart-bar');
      // Giữ khoảng trống phía trên cho nhãn giá trị.
      bar.style.setProperty('--bar', `${max ? (value / max) * 82 : 0}%`);
      item.append(el('span', 'week-chart-value', numberFormat.format(Math.round(value))), bar);
      chart.append(item);

      const label = el('li', day.isToday ? 'is-today' : '', day.isToday ? 'Hôm nay' : WEEKDAYS[day.date.getDay()]);
      label.append(el('small', '', shortDate.format(day.date)));
      labels.append(label);
    });

    const summary = $('#chart-summary');
    summary.replaceChildren();
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total === 0) {
      summary.textContent = 'Chưa có phiên học nào trong 7 ngày qua. Hoàn thành một phiên ở trang Tập trung để thấy biểu đồ.';
      return;
    }
    const best = days[values.indexOf(max)];
    const bestName = best.isToday ? 'hôm nay' : `${WEEKDAYS[best.date.getDay()]} ${shortDate.format(best.date)}`;
    const totalText = chartMetric === 'minutes' ? formatDuration(total) : `${numberFormat.format(total)} phiên`;
    summary.append(
      'Tổng 7 ngày: ', el('strong', '', totalText),
      ' · Nhiều nhất: ', el('strong', '', `${bestName} (${numberFormat.format(Math.round(max))} ${unit})`),
    );
  }

  function renderCompletion(breakdown) {
    const ring = $('#completion-ring');
    const rate = percent(breakdown.completed, breakdown.total);
    const degrees = (count) => (breakdown.total ? (count / breakdown.total) * 360 : 0);
    ring.classList.toggle('is-empty', breakdown.total === 0);
    ring.style.setProperty('--done-deg', `${degrees(breakdown.completed)}deg`);
    ring.style.setProperty('--pending-deg', `${degrees(breakdown.pending)}deg`);
    ring.style.setProperty('--overdue-deg', `${degrees(breakdown.overdue)}deg`);
    ring.setAttribute('aria-label', breakdown.total
      ? `Hoàn thành ${rate}%: ${breakdown.completed} đã xong, ${breakdown.pending} đang làm, ${breakdown.overdue} quá hạn`
      : 'Chưa có bài tập');
    $('#completion-rate').textContent = `${rate}%`;
    $('#legend-completed').textContent = numberFormat.format(breakdown.completed);
    $('#legend-pending').textContent = numberFormat.format(breakdown.pending);
    $('#legend-overdue').textContent = numberFormat.format(breakdown.overdue);
  }

  function renderSubjects() {
    const list = $('#subject-list');
    const subjects = subjectStats();
    const totalMinutes = subjects.reduce((sum, subject) => sum + subject.minutes, 0);
    const progressOf = (subject) => (subject.total ? subject.completed / subject.total : Infinity);
    const sorters = {
      minutes: (a, b) => b.minutes - a.minutes || b.total - a.total,
      tasks: (a, b) => b.total - a.total || b.minutes - a.minutes,
      progress: (a, b) => progressOf(a) - progressOf(b) || b.total - a.total,
      name: () => 0,
    };
    subjects.sort((a, b) => sorters[subjectSort.value](a, b) || a.name.localeCompare(b.name, 'vi'));
    list.replaceChildren();

    if (subjects.length === 0) {
      list.append(emptyState('Chưa có dữ liệu theo môn', 'Thêm bài tập có môn học hoặc hoàn thành phiên tập trung.', { text: 'Thêm bài tập →', href: 'tasks.html' }));
      return;
    }

    subjects.forEach((subject, index) => {
      const item = el('li', 'subject-item');
      item.style.setProperty('--swatch', SUBJECT_COLORS[index % SUBJECT_COLORS.length]);
      const row = el('div', 'subject-row');
      const name = el('h3', 'subject-name');
      name.append(el('span', 'subject-swatch'), el('span', '', subject.name));
      name.title = subject.name;
      row.append(name, el('span', 'subject-minutes', formatDuration(subject.minutes)));

      const rate = percent(subject.completed, subject.total);
      const meta = el('p', 'subject-meta');
      meta.append(
        el('span', '', subject.total ? `${subject.completed}/${subject.total} bài hoàn thành · ${rate}%` : 'Chưa có bài tập'),
        el('span', '', `${subject.sessions} phiên · ${percent(subject.minutes, totalMinutes)}% thời gian học`),
      );
      item.append(row, progressBar(rate, `Tiến độ bài tập môn ${subject.name}: ${rate}%`), meta);
      list.append(item);
    });
  }

  function renderGoals(today) {
    const list = $('#goal-list');
    list.replaceChildren();
    $('#goal-count').textContent = `${data.goals.length} mục tiêu`;

    if (data.goals.length === 0) {
      list.append(emptyState('Chưa có mục tiêu', 'Đặt một mục tiêu nhỏ, ví dụ học 300 phút trong tuần.'));
      return;
    }

    const week = weekStart(today);
    data.goals.forEach((goal) => {
      const current = goalProgress(goal, today);
      const value = Math.min(100, percent(current, goal.target));
      const achieved = current >= goal.target;
      const unit = goal.type === 'completed-tasks' ? 'bài' : 'phút';
      const item = el('li', `goal-item${achieved ? ' is-achieved' : ''}`);

      const ring = el('div', 'goal-ring');
      ring.style.setProperty('--pct', String(value));
      ring.setAttribute('aria-hidden', 'true');
      ring.append(el('span', '', `${value}%`));

      const copy = el('div', 'goal-copy');
      let detail = achieved
        ? `Đã đạt mục tiêu · ${numberFormat.format(Math.round(current))}/${numberFormat.format(goal.target)} ${unit}`
        : `${numberFormat.format(Math.round(current))}/${numberFormat.format(goal.target)} ${unit} · còn ${numberFormat.format(Math.ceil(goal.target - current))} ${unit}`;
      if (goal.type === 'weekly-minutes') detail += ` · tuần ${shortDate.format(week)}–${shortDate.format(addDays(week, 6))}`;
      copy.append(el('h3', '', goalTitle(goal)), el('p', '', detail), progressBar(value, `Tiến độ mục tiêu: ${value}%`));

      const remove = el('button', 'goal-delete', 'Xóa');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Xóa mục tiêu ${goalTitle(goal)}`);
      remove.addEventListener('click', () => {
        if (!window.confirm(`Xóa mục tiêu “${goalTitle(goal)}”?`)) return;
        if (saveGoals(data.goals.filter((entry) => entry.id !== goal.id))) showFeedback('Đã xóa mục tiêu.', true);
      });

      item.append(ring, copy, remove);
      list.append(item);
    });
  }

  function renderSubjectOptions() {
    const options = $('#goal-subject-options');
    const names = new Map();
    [...data.tasks, ...data.sessions].forEach((entry) => {
      const name = cleanSubject(entry.subject);
      if (name && !names.has(subjectKey(name))) names.set(subjectKey(name), name);
    });
    options.replaceChildren(...[...names.values()].sort((a, b) => a.localeCompare(b, 'vi')).map((name) => {
      const option = document.createElement('option');
      option.value = name;
      return option;
    }));
  }

  function render() {
    const today = new Date();
    const days = lastSevenDays(today);
    const breakdown = taskBreakdown(today);
    renderStats(days, breakdown);
    renderChart(days);
    renderCompletion(breakdown);
    renderSubjects();
    renderGoals(today);
    renderSubjectOptions();
  }

  /* ---------- Mục tiêu ---------- */

  function showFeedback(message, success = false) {
    goalFeedback.textContent = message;
    goalFeedback.classList.toggle('is-success', success);
  }

  function saveGoals(nextGoals) {
    try {
      window.StudyFlowStorage.write(KEYS.goals, nextGoals);
      data.goals = nextGoals;
      render();
      return true;
    } catch {
      showFeedback('Không lưu được. Hãy kiểm tra dung lượng lưu trữ của trình duyệt.');
      return false;
    }
  }

  function updateTargetHint() {
    const isTasks = goalType.value === 'completed-tasks';
    $('#goal-target-label').textContent = isTasks ? 'Chỉ tiêu (bài)' : 'Chỉ tiêu (phút)';
    goalTarget.placeholder = { 'weekly-minutes': 'Ví dụ: 300', 'daily-minutes': 'Ví dụ: 60', 'completed-tasks': 'Ví dụ: 10' }[goalType.value];
  }

  goalForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const target = Number(goalTarget.value);
    const subject = cleanSubject(goalSubject.value);
    if (!GOAL_TYPES.includes(goalType.value) || !Number.isInteger(target) || target < 1 || target > 10000) {
      goalTarget.setAttribute('aria-invalid', 'true');
      showFeedback('Nhập chỉ tiêu là số nguyên từ 1 đến 10.000.');
      goalTarget.focus();
      return;
    }
    goalTarget.removeAttribute('aria-invalid');

    const existing = data.goals.find((goal) => goal.type === goalType.value && subjectKey(goal.subject) === subjectKey(subject));
    if (existing) {
      if (saveGoals(data.goals.map((goal) => (goal.id === existing.id ? { ...goal, target } : goal)))) {
        showFeedback('Mục tiêu này đã có, chỉ tiêu đã được cập nhật.', true);
        goalForm.reset();
        updateTargetHint();
      }
      return;
    }

    const goal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: goalType.value,
      target,
      subject,
      createdAt: new Date().toISOString(),
    };
    if (saveGoals([...data.goals, goal])) {
      showFeedback('Đã thêm mục tiêu.', true);
      goalForm.reset();
      updateTargetHint();
    }
  });

  goalType.addEventListener('change', updateTargetHint);
  goalTarget.addEventListener('input', () => goalTarget.removeAttribute('aria-invalid'));
  subjectSort.addEventListener('change', renderSubjects);
  metricButtons.forEach((button) => button.addEventListener('click', () => {
    chartMetric = button.dataset.metric;
    metricButtons.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
    renderChart(lastSevenDays(new Date()));
  }));

  // Cập nhật khi dữ liệu thay đổi ở tab khác hoặc khi quay lại trang (có thể đã sang ngày mới).
  window.addEventListener('storage', (event) => {
    if (event.key === null || Object.values(KEYS).includes(event.key)) {
      data = loadData();
      render();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      data = loadData();
      render();
    }
  });

  updateTargetHint();
  render();
})();
