(() => {
  'use strict';

  // These older supplements have separate reading and recall panes inside the same chapter.
  const excluded = '.practice-pane, .recall-refs, details:not([open]), [hidden], [aria-hidden="true"], button, input, select, textarea, nav, .tools, .serial, .unit > small, a[href^="#q-"]';
  const compact = value => value.replace(/\s+/g, ' ').trim();

  function readingText(fragment) {
    const copy = fragment.cloneNode(true);
    copy.querySelectorAll(excluded).forEach(node => node.remove());
    for (const row of copy.querySelectorAll('tr')) {
      row.replaceWith([...row.cells].map(cell => compact(cell.textContent)).join(' | ') + '\n');
    }
    for (const block of copy.querySelectorAll('h2,h3,p,li,summary,.step,.step b,.if,.then,caption,.src,.callout,blockquote,br')) {
      block.after('\n');
    }
    return copy.textContent.split('\n').map(compact).filter(Boolean).join('\n');
  }

  function collectTargets() {
    const map = !!document.getElementById('mode-read');
    const selector = map
      ? 'section.unit.read-pane, .read-pane > .grid > .card, .read-pane > .scroll, .read-pane > details, #appendix > .card'
      : 'main > section.unit[id^="sec"]';
    return [...document.querySelectorAll(selector)].map(article => {
      const section = article.closest('section.unit');
      const chapter = compact(section.querySelector('h2').textContent);
      const heading = article.querySelector(':scope > h3, :scope > summary, caption');
      const title = heading ? readingText(heading) : chapter;
      const page = article.querySelector(':scope > small a[data-preview]');
      const tableSource = article.matches('.scroll') && article.nextElementSibling?.matches('.src')
        ? article.nextElementSibling.textContent : '';
      const source = page ? page.textContent : tableSource;
      return {article, title, chapter, subject: '법인세', source,
        standard: map ? '2026.7.1. 시행 법률 및 2026년 교재 · 2027년 1차 대비' : '2026년 교재 기준 · 2027년 1차 대비'};
    });
  }

  function getExcerpt(target, range) {
    if (!range || range.collapsed) return '';
    for (const endpoint of [range.startContainer, range.endContainer]) {
      const element = endpoint.nodeType === 1 ? endpoint : endpoint.parentElement;
      if (!target.article.contains(element) || element.closest(excluded)) return '';
    }
    return readingText(range.cloneContents());
  }

  function buildPrompt(target, excerpt, question) {
    const location = [document.querySelector('header h1').textContent, target.chapter,
      target.title !== target.chapter ? target.title : ''].filter(Boolean).join(' › ');
    return window.CTAReadingAI.composePrompt({
      location: '법인세 · ' + location,
      standard: target.standard,
      source: target.source,
      body: readingText(target.article)
    }, excerpt, question);
  }

  window.CTAReadingSupplement = {collectTargets, getExcerpt, buildPrompt};
})();
