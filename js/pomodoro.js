(() => {
  const storage = window.StudyFlowStorage;
  const sessionsKey = 'studyflow_sessions';
  const settingsKey = 'studyflow_pomodoro_settings';
  const defaultDurations = { focus: 25, break: 5 };
  const timeOutput = document.querySelector('#timer-time');
  const caption = document.querySelector('#timer-caption');
  const status = document.querySelector('#timer-status');
  const ring = document.querySelector('#timer-ring');
  const startButton = document.querySelector('#start-button');
  const resetButton = document.querySelector('#reset-button');
  const modeButtons = [...document.querySelectorAll('.mode-button[data-mode]')];
  const subjectSelect = document.querySelector('#subject-select');
  const taskSelect = document.querySelector('#task-select');
  const darkToggle = document.querySelector('#dark-mode-toggle');
  const soundToggle = document.querySelector('#sound-toggle');
  const todayOutput = document.querySelector('#today-minutes');
  const focusDurationOutput = document.querySelector('#focus-duration');
  const breakDurationOutput = document.querySelector('#break-duration');
  const focusDurationCopy = document.querySelector('#focus-duration-copy');
  const breakDurationCopy = document.querySelector('#break-duration-copy');
  const durationButtons = [...document.querySelectorAll('[data-duration]')];

  let mode = 'focus';
  let remaining = 0;
  let deadline = 0;
  let interval = null;
  let running = false;

  const readSettings = () => {
    const settings = storage.read(settingsKey);
    return settings && !Array.isArray(settings) ? settings : {};
  };
  const settings = readSettings();
  const durations = {
    focus: Number.isInteger(settings.focusMinutes) && settings.focusMinutes >= 5 && settings.focusMinutes <= 60 ? settings.focusMinutes : defaultDurations.focus,
    break: Number.isInteger(settings.breakMinutes) && settings.breakMinutes >= 1 && settings.breakMinutes <= 30 ? settings.breakMinutes : defaultDurations.break,
  };
  const durationSeconds = () => durations[mode] * 60;
  remaining = durationSeconds();
  darkToggle.checked = settings.darkMode === true;
  soundToggle.checked = settings.sound !== false;
  ring.closest('.pomodoro-page').dataset.theme = darkToggle.checked ? 'dark' : 'light';

  const localDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadSubjects = () => {
    const storedTasks = storage.read('studyflow_tasks');
    const tasks = Array.isArray(storedTasks) ? storedTasks.filter((task) => task && typeof task === 'object') : [];
    const subjects = [...new Set(tasks.map((task) => task.subject).filter((subject) => typeof subject === 'string' && subject.trim()))];
    subjects.forEach((subject) => {
      const option = document.createElement('option');
      option.value = subject;
      option.textContent = subject;
      subjectSelect.append(option);
    });
    tasks.filter((task) => task && task.completed !== true && typeof task.id === 'string' && typeof task.title === 'string').forEach((task) => {
      const option = document.createElement('option');
      option.value = task.id;
      option.textContent = task.subject ? `${task.title} · ${task.subject}` : task.title;
      taskSelect.append(option);
    });
  };

  const saveSettings = () => storage.write(settingsKey, {
    darkMode: darkToggle.checked,
    sound: soundToggle.checked,
    focusMinutes: durations.focus,
    breakMinutes: durations.break,
  });

  const updateTodayTotal = () => {
    const today = localDateKey(new Date());
    const savedSessions = storage.read(sessionsKey);
    const minutes = (Array.isArray(savedSessions) ? savedSessions : []).reduce((total, session) => {
      if (!session || typeof session.completedAt !== 'string' || !Number.isFinite(session.durationMinutes)) return total;
      const date = new Date(session.completedAt);
      return !Number.isNaN(date.getTime()) && localDateKey(date) === today ? total + session.durationMinutes : total;
    }, 0);
    todayOutput.textContent = String(minutes);
  };

  const render = () => {
    const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
    const seconds = (remaining % 60).toString().padStart(2, '0');
    const duration = durationSeconds();
    timeOutput.textContent = `${minutes}:${seconds}`;
    ring.style.setProperty('--progress', `${(remaining / duration) * 100}%`);
    caption.textContent = mode === 'focus' ? 'PHIÊN TẬP TRUNG' : 'NGHỈ NGẮN';
    startButton.textContent = running ? 'Tạm dừng' : remaining < duration ? 'Tiếp tục' : 'Bắt đầu';
    focusDurationOutput.textContent = `${durations.focus} phút`;
    breakDurationOutput.textContent = `${durations.break} phút`;
    focusDurationCopy.textContent = String(durations.focus);
    breakDurationCopy.textContent = String(durations.break);
    ring.closest('.pomodoro-page').dataset.mode = mode;
    durationButtons.forEach((button) => { button.disabled = running; });
    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  const playChime = () => {
    if (!soundToggle.checked || !window.AudioContext) return;
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.12, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.65);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.65);
    oscillator.onended = () => audio.close();
  };

  const completeTimer = () => {
    clearInterval(interval);
    interval = null;
    running = false;
    remaining = 0;
    if (mode === 'focus') {
      const storedSessions = storage.read(sessionsKey);
      const sessions = Array.isArray(storedSessions) ? storedSessions : [];
      const storedTasks = storage.read('studyflow_tasks');
      const selectedTask = (Array.isArray(storedTasks) ? storedTasks : []).find((task) => task && task.id === taskSelect.value);
      sessions.push({
        id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        subject: selectedTask?.subject || subjectSelect.value,
        completedAt: new Date().toISOString(),
        durationMinutes: durations.focus,
      });
      storage.write(sessionsKey, sessions);
      updateTodayTotal();
      status.textContent = `Hoàn thành phiên học! Đến lúc nghỉ ${durations.break} phút.`;
      mode = 'break';
      remaining = durationSeconds();
    } else {
      status.textContent = 'Hết giờ nghỉ. Sẵn sàng cho phiên tập trung tiếp theo.';
      mode = 'focus';
      remaining = durationSeconds();
    }
    playChime();
    render();
  };

  const tick = () => {
    remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (remaining === 0) completeTimer();
    else render();
  };

  const start = () => {
    if (running) {
      remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (remaining === 0) {
        completeTimer();
        return;
      }
      clearInterval(interval);
      interval = null;
      running = false;
      status.textContent = 'Đồng hồ đang tạm dừng.';
      render();
      return;
    }
    if (remaining <= 0) remaining = durationSeconds();
    running = true;
    deadline = Date.now() + remaining * 1000;
    status.textContent = mode === 'focus' ? 'Đang tập trung. Cố lên!' : 'Đang nghỉ ngắn.';
    interval = window.setInterval(tick, 1000);
    render();
  };

  const reset = () => {
    clearInterval(interval);
    interval = null;
    running = false;
    remaining = durationSeconds();
    status.textContent = 'Đồng hồ đã được đặt lại.';
    render();
  };

  modeButtons.forEach((button) => button.addEventListener('click', () => {
    clearInterval(interval);
    interval = null;
    running = false;
    mode = button.dataset.mode;
    remaining = durationSeconds();
    status.textContent = mode === 'focus' ? 'Sẵn sàng cho phiên tập trung.' : 'Sẵn sàng nghỉ ngắn.';
    render();
  }));
  startButton.addEventListener('click', start);
  resetButton.addEventListener('click', reset);
  durationButtons.forEach((button) => button.addEventListener('click', () => {
    const type = button.dataset.duration;
    const next = durations[type] + Number(button.dataset.step);
    const limit = type === 'focus' ? { min: 5, max: 60 } : { min: 1, max: 30 };
    if (next < limit.min || next > limit.max) return;
    durations[type] = next;
    if (mode === type) remaining = durationSeconds();
    saveSettings();
    render();
  }));
  darkToggle.addEventListener('change', () => {
    ring.closest('.pomodoro-page').dataset.theme = darkToggle.checked ? 'dark' : 'light';
    saveSettings();
  });
  soundToggle.addEventListener('change', saveSettings);

  loadSubjects();
  updateTodayTotal();
  render();
})();
