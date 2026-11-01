(() => {
  const recall = document.querySelector('#mode-recall');
  const read = document.querySelector('#mode-read');
  const status = document.querySelector('#mode-status');

  function conceal() {
    document.querySelectorAll('details.answer[open], details.stem[open]').forEach(item => {
      item.open = false;
    });
  }

  function follow(hash) {
    const target = document.getElementById(hash.slice(1));
    if (!target) return false;
    if (hash.startsWith('#pdf-view-')) {
      const dialog = document.querySelector('#source-preview');
      if (!dialog.open) target.click();
      return true;
    }

    const isQuestion = hash.startsWith('#q-');
    const isReference = hash.startsWith('#ref-') || target.matches('.read-pane');
    const isSource = hash.startsWith('#pdf-at-');
    if (!isQuestion && !isReference && !isSource) return false;

    if (recall && (isQuestion || isReference || target.closest('.practice-pane, .read-pane'))) {
      if (isQuestion || target.closest('.practice-pane')) {
        recall.checked = true;
        if (isQuestion) conceal();
      } else {
        read.checked = true;
      }
    }
    for (let parent = target.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
    target.scrollIntoView({block: 'start'});
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.focus({preventScroll: true});
    return true;
  }

  if (recall) {
    document.querySelector('.print').addEventListener('click', () => window.print());
    document.querySelector('#close-answers').addEventListener('click', () => {
      conceal();
      status.textContent = '모든 카드의 답을 가렸습니다.';
    });
    for (const mode of [recall, read]) {
      mode.addEventListener('change', () => {
        conceal();
        status.textContent = recall.checked ? '회상하기' : '조문 읽기';
        if (location.hash) history.replaceState(null, '', '#study');
      });
    }
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    if (link.hash.startsWith('#q-')) {
      const back = document.getElementById(link.hash.slice(1))?.querySelector('.jump-ref');
      if (back) {
        back.dataset.primary ||= back.getAttribute('href');
        const branch = link.closest('[id^="ref-"]');
        back.setAttribute('href', branch ? '#' + branch.id : back.dataset.primary);
      }
    }
    if (!follow(link.hash)) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  });
  window.addEventListener('hashchange', () => follow(location.hash));
  window.addEventListener('pageshow', () => {
    conceal();
    follow(location.hash);
  });
})();
