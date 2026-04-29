const STORAGE_KEY = 'voice-agent-theme';

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const theme = saved || 'dark';
  applyTheme(theme);

  const toggle = document.getElementById('theme-toggle');
  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const moon = document.getElementById('icon-moon');
  const sun = document.getElementById('icon-sun');
  moon.style.display = theme === 'dark' ? 'block' : 'none';
  sun.style.display = theme === 'light' ? 'block' : 'none';
}
