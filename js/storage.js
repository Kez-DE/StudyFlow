window.StudyFlowStorage = {
  read(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  },
  write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};
