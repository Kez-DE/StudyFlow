(() => {
  const key = 'studyflow_tasks';
  const form = document.querySelector('#task-form');
  const titleInput = document.querySelector('#task-title');
  const taskIdInput = document.querySelector('#task-id');
  const subjectInput = document.querySelector('#task-subject');
  const dueInput = document.querySelector('#task-due-date');
  const priorityInput = document.querySelector('#task-priority');
  const list = document.querySelector('#task-list');
  const empty = document.querySelector('#task-empty');
  const feedback = document.querySelector('#task-feedback');
  const cancelButton = document.querySelector('#task-cancel');
  const submitButton = document.querySelector('#task-submit');
  const filters = ['#task-search', '#status-filter', '#priority-filter', '#sort-order'].map((selector) => document.querySelector(selector));
  let tasks = readTasks();

  function readTasks() {
    const stored = window.StudyFlowStorage.read(key);
    return Array.isArray(stored) ? stored.filter((task) => task && typeof task === 'object') : [];
  }

  function localDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  }

  function save(nextTasks) {
    try {
      window.StudyFlowStorage.write(key, nextTasks);
      tasks = nextTasks;
      feedback.textContent = '';
      render();
      return true;
    } catch {
      feedback.textContent = 'Không lưu được. Hãy kiểm tra dung lượng lưu trữ của trình duyệt.';
      return false;
    }
  }

  function render() {
    const [searchInput, statusFilter, priorityFilter, sortOrder] = filters;
    const query = searchInput.value.trim().toLocaleLowerCase('vi');
    const filtered = tasks.filter((task) => {
      const matchesQuery = `${task.title || ''} ${task.subject || ''}`.toLocaleLowerCase('vi').includes(query);
      const matchesStatus = statusFilter.value === 'all' || (statusFilter.value === 'completed' ? task.completed === true : task.completed !== true);
      const matchesPriority = priorityFilter.value === 'all' || task.priority === priorityFilter.value;
      return matchesQuery && matchesStatus && matchesPriority;
    }).sort((a, b) => {
      const dateA = typeof a.dueDate === 'string' ? a.dueDate : '9999-12-31';
      const dateB = typeof b.dueDate === 'string' ? b.dueDate : '9999-12-31';
      return (dateA.localeCompare(dateB) * (sortOrder.value === 'desc' ? -1 : 1)) || String(a.title || '').localeCompare(String(b.title || ''), 'vi');
    });

    document.querySelector('#task-total').textContent = String(tasks.length);
    document.querySelector('#task-pending').textContent = String(tasks.filter((task) => task.completed !== true).length);
    document.querySelector('#task-completed').textContent = String(tasks.filter((task) => task.completed === true).length);
    document.querySelector('#visible-task-count').textContent = `${filtered.length} bài`;
    list.replaceChildren();
    empty.hidden = filtered.length > 0;

    filtered.forEach((task) => {
      const item = document.createElement('li');
      const due = localDate(task.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const overdue = due && due < today && task.completed !== true;
      item.className = `task-item${task.completed === true ? ' is-complete' : ''}${overdue ? ' is-overdue' : ''}`;

      const complete = document.createElement('button');
      complete.type = 'button';
      complete.className = 'task-complete';
      complete.setAttribute('aria-label', task.completed === true ? `Đánh dấu ${task.title} chưa hoàn thành` : `Đánh dấu ${task.title} đã hoàn thành`);
      complete.setAttribute('aria-pressed', String(task.completed === true));
      complete.textContent = task.completed === true ? '✓' : '';
      complete.addEventListener('click', () => save(tasks.map((entry) => entry.id === task.id ? { ...entry, completed: entry.completed !== true } : entry)));

      const content = document.createElement('div');
      content.className = 'task-item-content';
      const title = document.createElement('h3');
      title.textContent = task.title || 'Bài tập chưa có tên';
      const details = document.createElement('p');
      const dueText = due ? new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' }).format(due) : 'Chưa có deadline';
      details.textContent = [task.subject || 'Chưa phân môn', dueText].join(' · ');
      content.append(title, details);

      const priority = document.createElement('span');
      const priorityValue = ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium';
      priority.className = `priority-badge priority-${priorityValue}`;
      priority.textContent = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' }[priorityValue];

      const actions = document.createElement('div');
      actions.className = 'task-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'icon-action';
      edit.textContent = 'Sửa';
      edit.addEventListener('click', () => beginEdit(task));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'icon-action danger-action';
      remove.textContent = 'Xóa';
      remove.addEventListener('click', () => {
        if (window.confirm(`Xóa bài tập “${task.title || 'chưa có tên'}”?`)) save(tasks.filter((entry) => entry.id !== task.id));
      });
      actions.append(edit, remove);
      item.append(complete, content, priority, actions);
      list.append(item);
    });
  }

  function beginEdit(task) {
    taskIdInput.value = task.id;
    titleInput.value = task.title || '';
    subjectInput.value = task.subject || '';
    dueInput.value = task.dueDate || '';
    priorityInput.value = ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium';
    document.querySelector('#task-form-title').textContent = 'Chỉnh sửa bài tập';
    submitButton.textContent = 'Lưu thay đổi';
    cancelButton.hidden = false;
    titleInput.focus();
  }

  function resetForm() {
    form.reset();
    taskIdInput.value = '';
    priorityInput.value = 'medium';
    document.querySelector('#task-form-title').textContent = 'Thêm bài tập';
    submitButton.textContent = 'Thêm bài tập';
    cancelButton.hidden = true;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    const dueDate = dueInput.value;
    if (!title || !localDate(dueDate) || !['low', 'medium', 'high'].includes(priorityInput.value)) {
      feedback.textContent = 'Nhập tên bài tập và deadline hợp lệ.';
      return;
    }
    const id = taskIdInput.value || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const previous = tasks.find((task) => task.id === id);
    const nextTask = {
      ...(previous || {}),
      id,
      title,
      subject: subjectInput.value.trim(),
      dueDate,
      priority: priorityInput.value,
      completed: previous?.completed === true,
    };
    const nextTasks = previous ? tasks.map((task) => task.id === id ? nextTask : task) : [...tasks, nextTask];
    if (save(nextTasks)) resetForm();
  });

  cancelButton.addEventListener('click', resetForm);
  filters.forEach((control) => control.addEventListener(control.type === 'search' ? 'input' : 'change', render));
  window.addEventListener('storage', (event) => {
    if (event.key === key) {
      tasks = readTasks();
      render();
    }
  });
  render();
})();
