(() => {
  'use strict';

  const text = element => element?.textContent.trim() || '';
  const readingSummaries = new Set(['판단을 가르는 조건과 근거', '판단 조건과 근거 확인', '세부 요건·사례 더 보기']);

  function collectTargets() {
    const subject = text(document.querySelector('main > header .kicker')).split('/')[0].trim();
    const part = text(document.querySelector('main > header h1'));
    const standard = [text(document.querySelector('main > footer')).replace(/\s+/g, ' '),
      text(document.querySelector('main > p.sub'))].filter(Boolean).join('\n');
    return Array.from(document.querySelectorAll('main > section.unit > article.item'), article => ({
      article, subject, part, standard,
      chapter: text(article.parentElement.querySelector(':scope > h2')),
      title: Array.from(article.querySelectorAll(':scope > h3'), text).join(' / '),
      page: text(article.querySelector(':scope > small a'))
    }));
  }

  // Corporate tax also embeds exercises, answer keys and exam links inside reading items.
  // Keep only the printed headings, main paragraphs, and explanations the reader has opened.
  function readingParts(article) {
    const blocks = [], sources = new Set();
    for (const child of article.children) {
      if (child.hidden) continue;
      if (child.matches('h3, p:not([class]), blockquote[data-ai-reading], figure[data-ai-reading]')) {
        blocks.push(child);
        // Statute-based notes cite their primary source inside the visible excerpt.
        for (const link of child.querySelectorAll('a[href]')) {
          if (link.protocol === 'https:' && ['www.law.go.kr', 'law.go.kr', 'i.nts.go.kr'].includes(link.hostname)) sources.add(link.href);
        }
      } else if (child.matches('details[open]') &&
                 readingSummaries.has(text(child.querySelector(':scope > summary')))) {
        blocks.push(...child.querySelectorAll(':scope > .solution:not([hidden]), :scope > .formula:not([hidden])'));
        for (const link of child.querySelectorAll(':scope > p > a[href]')) {
          if (link.protocol === 'https:' && ['www.law.go.kr', 'law.go.kr', 'i.nts.go.kr'].includes(link.hostname)) {
            sources.add(link.href);
          }
        }
      }
    }
    return {blocks, sources};
  }

  function getExcerpt({article}, range) {
    if (!range || range.collapsed || !article.contains(range.commonAncestorContainer) ||
        article.closest('[hidden]')) return '';
    const {blocks} = readingParts(article);
    const walker = article.ownerDocument.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    const lines = [];
    let lastBlock;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement.closest('.mobile-column-label')) continue;
      if (!range.intersectsNode(node)) continue;
      const from = node === range.startContainer ? range.startOffset : 0;
      const to = node === range.endContainer ? range.endOffset : node.length;
      const chunk = node.data.slice(from, to);
      if (!chunk.trim()) continue;
      const block = blocks.find(element => element.contains(node));
      if (!block || node.parentElement.closest('[hidden], button, nav, .tools, .fact')) return '';
      if (block !== lastBlock) lines.push('');
      lines[lines.length - 1] += chunk;
      lastBlock = block;
    }
    return lines.map(line => line.trim()).join('\n');
  }

  function readingText(block) {
    if (!block.querySelector('.mobile-column-label')) return block.innerText.trim();
    const copy = block.cloneNode(true);
    copy.querySelectorAll('.mobile-column-label').forEach(label => label.remove());
    // Render the clean copy offscreen to retain innerText's paragraph/table line breaks.
    // Reading textContent from a detached clone would merge adjacent table cells.
    const holder = document.createElement('div');
    holder.setAttribute('aria-hidden', 'true');
    holder.inert = true;
    holder.style.cssText = 'position:fixed;left:-100000px;top:0;opacity:0;pointer-events:none';
    holder.style.width = block.getBoundingClientRect().width + 'px';
    holder.append(copy);
    block.parentElement.append(holder);
    try { return copy.innerText.trim(); }
    finally { holder.remove(); }
  }

  function composePrompt({location, standard, source, body}, excerpt = '', question = '') {
    const parts = [
      '[세무사 1차 · 학습 내용 이해]\n' + location,
      standard,
      source && '자료 출처\n' + source,
      '읽고 있는 학습 내용\n' + body,
      excerpt.trim() && '집중해서 이해하고 싶은 문장\n' + excerpt.trim(),
      question.trim() && '내 질문\n' + question.trim(),
      '내가 표시한 문장과 질문을 우선으로, 이 단락의 내용을 쉬운 말로 설명해 주세요. 결론을 가르는 조건을 짚고, 조건 하나를 바꾸면 결과가 어떻게 달라지는지 짧은 예로 보여 주세요. 마지막에는 내가 직접 판단할 확인 질문 하나를 내고 답을 기다려 주세요.',
      '자료의 판단 기준일과 사례의 거래일·귀속기간을 구분해 주세요. 조문 원문과 학습용 설명을 구별하고, 추가 설명에 필요한 근거를 확인할 수 없으면 그 부분을 알려 주세요.'
    ];
    return parts.filter(Boolean).join('\n\n');
  }

  function buildPrompt(target, excerpt, question) {
    const {article, subject, part, chapter, title, page, standard} = target;
    const {blocks, sources} = readingParts(article);
    const source = [page, ...sources].filter(Boolean).join('\n');
    const body = blocks.map(readingText).filter(Boolean).join('\n');
    return composePrompt({location: [subject, part, chapter, title].join(' · '), standard, source, body}, excerpt, question);
  }

  window.CTAReadingAI = {collectTargets, getExcerpt, composePrompt, buildPrompt};
})();
