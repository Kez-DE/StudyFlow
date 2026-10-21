// Chức năng Pomodoro – thành viên 4
(() => {
  'use strict';

  const STORAGE_KEY = 'auraPomodoro.settings.v1';
  const STATS_KEY = 'auraPomodoro.stats.v1';
  const DAY_KEY = 'auraPomodoro.statsDay.v1';
  const CIRCUMFERENCE = 2 * Math.PI * 139;
  const MODES = {
    focus: { label: 'Focus', caption: 'Sẵn sàng tập trung?', setting: 'focusDuration' },
    short: { label: 'Nghỉ ngắn', caption: 'Thư giãn một chút nhé', setting: 'shortDuration' },
    long: { label: 'Nghỉ dài', caption: 'Bạn đã làm rất tốt', setting: 'longDuration' }
  };
  const DEFAULT_SETTINGS = {
    focusDuration: 25,
    shortDuration: 5,
    longDuration: 15,
    cycleLength: 4,
    soundEnabled: true,
    notificationsEnabled: false
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    display: $('timerDisplay'), caption: $('timerCaption'), progress: $('progressRing'),
    start: $('startButton'), reset: $('resetButton'), playIcon: $('playIcon'), pauseIcon: $('pauseIcon'),
    tabs: [...document.querySelectorAll('.mode-tab')], dots: $('sessionDots'), heading: $('sessionHeading'),
    subtitle: $('sessionSubtitle'), focusMinutes: $('focusMinutes'), sessions: $('completedSessions'), cycles: $('completedCycles'),
    modal: $('settingsModal'), form: $('settingsForm'), toast: $('toast')
  };

  let settings = loadSettings();
  let stats = loadStats();
  let mode = 'focus';
  let remainingSeconds = durationFor(mode);
  let totalSeconds = remainingSeconds;
  let intervalId = null;
  let running = false;
  let toastTimeout = null;
  let audioContext = null;
  let modalReturnFocus = null;

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return stored ? { ...DEFAULT_SETTINGS, ...stored } : { ...DEFAULT_SETTINGS };
    } catch { return { ...DEFAULT_SETTINGS }; }
  }

  function loadStats() {
    try {
      if (localStorage.getItem(DAY_KEY) !== todayKey()) {
        localStorage.setItem(DAY_KEY, todayKey());
        const empty = { focusSessions: 0, focusMinutes: 0, cycles: 0 };
        localStorage.setItem(STATS_KEY, JSON.stringify(empty));
        return empty;
      }
      const data = JSON.parse(localStorage.getItem(STATS_KEY));
      return { focusSessions: 0, focusMinutes: 0, cycles: 0, ...(data || {}) };
    } catch { return { focusSessions: 0, focusMinutes: 0, cycles: 0 }; }
  }

  function saveStats() {
    try {
      localStorage.setItem(DAY_KEY, todayKey());
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch { /* Storage may be unavailable in private browsing. */ }
  }

  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* Optional persistence. */ }
  }

  function durationFor(which) { return Number(settings[MODES[which].setting]) * 60; }

  function formatTime(total) {
    const safe = Math.max(0, Math.ceil(total));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function renderTimer() {
    els.display.textContent = formatTime(remainingSeconds);
    const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
    els.progress.style.strokeDasharray = String(CIRCUMFERENCE);
    els.progress.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
    document.title = `${formatTime(remainingSeconds)} · StudyFlow Pomodoro`;
    els.start.setAttribute('aria-label', running ? 'Tạm dừng đồng hồ' : 'Bắt đầu đồng hồ');
    els.playIcon.classList.toggle('hidden', running);
    els.pauseIcon.classList.toggle('hidden', !running);
    els.caption.textContent = running ? (mode === 'focus' ? 'Đang tập trung… cố lên nhé' : 'Hãy tận hưởng giờ nghỉ') : MODES[mode].caption;
  }

  function renderStats() {
    els.focusMinutes.textContent = stats.focusMinutes;
    els.sessions.textContent = stats.focusSessions;
    els.cycles.textContent = stats.cycles;
    const position = stats.focusSessions % settings.cycleLength;
    const finishedCurrentCycle = stats.focusSessions > 0 && position === 0;
    const dots = els.dots.querySelectorAll('.session-dot');
    const visibleCount = settings.cycleLength;
    els.dots.innerHTML = '';
    for (let i = 0; i < visibleCount; i += 1) {
      const dot = document.createElement('span');
      dot.className = 'session-dot';
      if (i < position || (finishedCurrentCycle && i === visibleCount - 1)) dot.classList.add('complete');
      else if (i === position && !finishedCurrentCycle) dot.classList.add('current');
      els.dots.appendChild(dot);
    }
    els.dots.setAttribute('aria-label', `Đã hoàn thành ${position} trên ${visibleCount} phiên trong chu kỳ hiện tại`);
    if (stats.focusSessions === 0) {
      els.heading.textContent = 'Từng bước một';
      els.subtitle.textContent = 'Hoàn thành một phiên tập trung để bắt đầu.';
    } else if (finishedCurrentCycle) {
      els.heading.textContent = 'Một chu kỳ trọn vẹn!';
      els.subtitle.textContent = 'Bạn đã hoàn thành mục tiêu của chu kỳ này.';
    } else {
      els.heading.textContent = `Bạn đang làm rất tốt · ${position}/${visibleCount}`;
      els.subtitle.textContent = `Còn ${visibleCount - position} phiên tập trung để đến giờ nghỉ dài.`;
    }
  }

  function setMode(nextMode, showToast = false) {
    if (!MODES[nextMode]) return;
    stopTimer();
    mode = nextMode;
    remainingSeconds = durationFor(mode);
    totalSeconds = remainingSeconds;
    els.tabs.forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    renderTimer();
    if (showToast) showMessage(`${MODES[mode].label} · ${settings[MODES[mode].setting]} phút`);
  }

  function startTimer() {
    if (running) return;
    if (remainingSeconds <= 0) remainingSeconds = totalSeconds = durationFor(mode);
    running = true;
    const deadline = Date.now() + remainingSeconds * 1000;
    intervalId = window.setInterval(() => {
      remainingSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      renderTimer();
      if (remainingSeconds <= 0) completeTimer();
    }, 200);
    renderTimer();
  }

  function stopTimer() {
    if (intervalId !== null) window.clearInterval(intervalId);
    intervalId = null;
    running = false;
  }

  function toggleTimer() {
    if (running) {
      // Preserve seconds already elapsed when pausing.
      stopTimer();
      renderTimer();
      showMessage('Đã tạm dừng đồng hồ.');
    } else startTimer();
  }

  function resetTimer() {
    stopTimer();
    remainingSeconds = totalSeconds = durationFor(mode);
    renderTimer();
    showMessage('Đồng hồ đã được đặt lại.');
  }

  function completeTimer() {
    stopTimer();
    remainingSeconds = 0;
    renderTimer();
    playChime();
    sendNotification();

    if (mode === 'focus') {
      stats.focusSessions += 1;
      stats.focusMinutes += Number(settings.focusDuration);
      const shouldTakeLongBreak = stats.focusSessions % settings.cycleLength === 0;
      if (shouldTakeLongBreak) stats.cycles += 1;
      saveStats();
      renderStats();
      const nextMode = shouldTakeLongBreak ? 'long' : 'short';
      showMessage(shouldTakeLongBreak ? 'Hoàn thành chu kỳ! Đến lúc nghỉ dài.' : 'Hoàn thành phiên tập trung! Đến lúc nghỉ ngắn.');
      setMode(nextMode);
      els.caption.textContent = shouldTakeLongBreak ? 'Tuyệt vời! Hãy nghỉ ngơi nhé' : 'Tốt lắm! Hãy nghỉ một chút nhé';
    } else {
      showMessage('Hết giờ nghỉ. Sẵn sàng tập trung trở lại?');
      setMode('focus');
      els.caption.textContent = 'Nạp lại năng lượng và bắt đầu nhé';
    }
    renderTimer();
  }

  function playChime() {
    if (!settings.soundEnabled) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const now = audioContext.currentTime;
      [659.25, 783.99, 987.77].forEach((frequency, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + i * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.16 + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.32);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(now + i * 0.16);
        osc.stop(now + i * 0.16 + 0.34);
      });
    } catch { /* Audio is optional and may be disabled by the browser. */ }
  }

  async function sendNotification() {
    if (!settings.notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    const title = mode === 'focus' ? 'Đã hoàn thành phiên tập trung!' : 'Đã hết giờ nghỉ!';
    try { new Notification(title, { body: mode === 'focus' ? 'Bạn đã làm rất tốt. Đến lúc nghỉ ngơi.' : 'Sẵn sàng bắt đầu phiên tập trung tiếp theo?', tag: 'aura-pomodoro' }); } catch { /* Browser may block notifications. */ }
  }

  function showMessage(message) {
    els.toast.textContent = message;
    els.toast.classList.add('visible');
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => els.toast.classList.remove('visible'), 2600);
  }

  function openSettings() {
    modalReturnFocus = document.activeElement;
    $('focusDuration').value = settings.focusDuration;
    $('shortDuration').value = settings.shortDuration;
    $('longDuration').value = settings.longDuration;
    $('cycleLength').value = settings.cycleLength;
    $('soundEnabled').checked = settings.soundEnabled;
    $('notificationsEnabled').checked = settings.notificationsEnabled;
    els.modal.classList.remove('hidden');
    $('focusDuration').focus();
  }

  function closeSettings() {
    els.modal.classList.add('hidden');
    if (modalReturnFocus && typeof modalReturnFocus.focus === 'function') modalReturnFocus.focus();
  }

  els.start.addEventListener('click', toggleTimer);
  els.reset.addEventListener('click', resetTimer);
  els.tabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));

  // The StudyFlow navigation scrolls to the sections available in this prototype.
  const navLinks = [...document.querySelectorAll('.nav-link')];
  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      if (link.hasAttribute('data-coming-soon')) {
        event.preventDefault();
        showMessage('Mục này sẽ được bổ sung sau.');
        return;
      }

      const target = link.dataset.navTarget;
      if (!target) return;
      navLinks.forEach((item) => {
        item.classList.toggle('active', item === link);
        item.removeAttribute('aria-current');
      });
      link.setAttribute('aria-current', 'page');

      if (target === 'dashboard') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const destinationId = target === 'focus' ? 'pomodoro' : 'stats';
        $(destinationId).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  $('openSettings').addEventListener('click', openSettings);
  $('closeSettings').addEventListener('click', closeSettings);
  $('cancelSettings').addEventListener('click', closeSettings);
  els.modal.addEventListener('click', (event) => { if (event.target === els.modal) closeSettings(); });

  els.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = [
      ['focusDuration', 1, 180, 'Thời gian tập trung'],
      ['shortDuration', 1, 60, 'Thời gian nghỉ ngắn'],
      ['longDuration', 1, 90, 'Thời gian nghỉ dài'],
      ['cycleLength', 2, 8, 'Số phiên trong chu kỳ']
    ];
    for (const [id, min, max, label] of fields) {
      const field = $(id);
      const value = Number(field.value);
      if (!Number.isInteger(value) || value < min || value > max) {
        field.setCustomValidity(`${label}: vui lòng nhập số nguyên từ ${min} đến ${max}.`);
        field.reportValidity();
        field.addEventListener('input', () => field.setCustomValidity(''), { once: true });
        return;
      }
      field.setCustomValidity('');
    }
    const notificationWasEnabled = settings.notificationsEnabled;
    settings = {
      focusDuration: Number($('focusDuration').value),
      shortDuration: Number($('shortDuration').value),
      longDuration: Number($('longDuration').value),
      cycleLength: Number($('cycleLength').value),
      soundEnabled: $('soundEnabled').checked,
      notificationsEnabled: $('notificationsEnabled').checked
    };
    if (settings.notificationsEnabled && !notificationWasEnabled && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        settings.notificationsEnabled = false;
        $('notificationsEnabled').checked = false;
        showMessage('Trình duyệt chưa cấp quyền thông báo.');
      }
    } else if (settings.notificationsEnabled && !('Notification' in window)) {
      settings.notificationsEnabled = false;
      $('notificationsEnabled').checked = false;
      showMessage('Trình duyệt này không hỗ trợ thông báo.');
    }
    saveSettings();
    // Keep the timer paused after changing settings to avoid unexpectedly restarting a session.
    stopTimer();
    remainingSeconds = totalSeconds = durationFor(mode);
    renderTimer();
    renderStats();
    closeSettings();
    showMessage('Đã lưu cài đặt.');
  });

  $('clearStatsButton').addEventListener('click', () => {
    if (!window.confirm('Bạn có chắc muốn xóa toàn bộ thống kê hôm nay?')) return;
    stats = { focusSessions: 0, focusMinutes: 0, cycles: 0 };
    saveStats();
    renderStats();
    showMessage('Đã xóa thống kê hôm nay.');
  });

  document.addEventListener('keydown', (event) => {
    const tag = document.activeElement?.tagName;
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.activeElement?.isContentEditable;
    if (event.code === 'Space' && !isTyping && els.modal.classList.contains('hidden')) {
      event.preventDefault();
      toggleTimer();
    }
    if (event.key === 'Escape' && !els.modal.classList.contains('hidden')) closeSettings();
  });

  // If the browser is left open across midnight, start a fresh daily tally.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && localStorage.getItem(DAY_KEY) !== todayKey()) {
      stats = { focusSessions: 0, focusMinutes: 0, cycles: 0 };
      saveStats();
      renderStats();
    }
  });

  renderTimer();
  renderStats();
})();
