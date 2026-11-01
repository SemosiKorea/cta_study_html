(() => {
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const units = window.CTA_UNITS || [];
  const prefix = 'cta_study_html.read.v1.';
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  function today() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }
  const buttons = [...document.querySelectorAll('[data-unit]')];
  function refresh() {
    try {
      for (const b of buttons) {
        const date = localStorage.getItem(prefix + b.dataset.unit);
        const complete = datePattern.test(date || '');
        b.textContent = complete ? '✓ ' + date + ' 완료 · 취소' : '읽기 완료 표시';
        b.setAttribute('aria-pressed', String(complete));
      }
      const history = document.querySelector('#read-history');
      if (!history) return;
      const rows = units.map(u => ({...u, date:localStorage.getItem(prefix + u.key)}))
        .filter(u => datePattern.test(u.date || '')).sort((a,b) => b.date.localeCompare(a.date) || a.order-b.order);
      document.querySelector('#read-count').textContent = rows.length + '개 단원 완료';
      const items = rows.map(u => {
        const item = document.createElement('li'), link = document.createElement('a');
        link.href = new URL(u.url,root).href;
        link.textContent = u.subject + ' · ' + u.title;
        item.append(document.createTextNode(u.date + '　'),link); return item;
      });
      if (!items.length) { const empty=document.createElement('li'); empty.textContent='아직 완료 표시한 단원이 없습니다.'; items.push(empty); }
      history.replaceChildren(...items);
    } catch { unavailable(); }
  }
  function unavailable() {
    for (const b of buttons) { b.disabled=true; b.textContent='이 브라우저에서 기록을 저장할 수 없습니다'; }
    const count=document.querySelector('#read-count');
    if (count) count.textContent='브라우저의 저장 공간을 사용할 수 없습니다.';
  }
  for (const b of buttons) b.addEventListener('click', () => {
    try {
      const key = prefix + b.dataset.unit;
      if (datePattern.test(localStorage.getItem(key) || '')) localStorage.removeItem(key);
      else localStorage.setItem(key,today());
      refresh();
    } catch { unavailable(); }
  });
  window.addEventListener('pageshow',refresh);
  window.addEventListener('storage', e => { if (!e.key || e.key.startsWith(prefix)) refresh(); });
  refresh();
  const dialog = document.querySelector('#source-preview');
  if (!dialog || !dialog.showModal) return;
  const img=dialog.querySelector('img'), title=dialog.querySelector('strong'), full=dialog.querySelector('a');
  document.addEventListener('click',e => {
    const a=e.target.closest('a[data-preview]');
    if (!a || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
    e.preventDefault();
    title.textContent=a.title || a.textContent;
    full.href=a.href; img.alt=title.textContent; img.src=a.dataset.preview;
    dialog.showModal(); dialog.scrollTop=0;
  });
  dialog.querySelector('button').addEventListener('click',() => dialog.close());
  dialog.addEventListener('click',e => { if (e.target===dialog) dialog.close(); });
})();
