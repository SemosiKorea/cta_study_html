// Apply before the first paint, then connect the page's appearance selectors.
(() => {
  const key = 'cta.appearance.v1';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const root = document.documentElement;
  let preference = 'system';

  function restore() {
    try { preference = localStorage.getItem(key) || 'system'; } catch { /* Storage is optional. */ }
    if (!['light', 'dark'].includes(preference)) preference = 'system';
    apply();
  }

  function apply() {
    const dark = preference === 'dark' || (preference === 'system' && media.matches);
    root.dataset.studyTheme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    for (const control of document.querySelectorAll('select[data-appearance]')) control.value = preference;
  }

  restore();
  media.addEventListener('change', apply);
  window.addEventListener('pageshow', restore);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) restore();
  });
  document.addEventListener('DOMContentLoaded', () => {
    for (const slot of document.querySelectorAll('[data-theme-controls]')) {
      const control = document.createElement('select');
      control.dataset.appearance = '';
      control.setAttribute('aria-label', '화면 테마');
      for (const [value, label] of [['system', '기기 설정'], ['light', '라이트 모드'], ['dark', '다크 모드']]) {
        control.add(new Option(label, value));
      }
      control.value = preference;
      control.addEventListener('change', () => {
        preference = control.value;
        try { localStorage.setItem(key, preference); } catch { /* Apply for this visit. */ }
        apply();
      });
      slot.append(control);
    }
  });
})();
