(() => {
  'use strict';

  const supplement = window.CTAReadingSupplement;
  const reading = supplement || window.CTAReadingAI;
  const targets = reading.collectTargets();
  if (!targets.length) return;

  const {dialog, get, setDraft, show} = window.CTAStudyDialog({
    fields: `
      <label class="ai-reading-label" for="ai-excerpt">이해가 안 되는 문장 <small>(선택)</small></label>
      <textarea id="ai-excerpt" rows="2" autocomplete="off" placeholder="본문에서 선택한 문장이 표시됩니다. 직접 입력해도 됩니다."></textarea>
      <label class="ai-reading-label" for="ai-question">궁금한 점 <small>(선택)</small></label>
      <textarea id="ai-question" rows="2" autocomplete="off" placeholder="예외가 적용되면 왜 결론이 달라지나요?"></textarea>`,
    editHelp: '아래 질문을 고쳐 쓸 수 있습니다. 위의 문장이나 궁금한 점을 바꾸면 질문을 새로 작성합니다.',
    manualChatGPT: true,
    onClose: clear
  });
  const excerpt = get('excerpt'), question = get('question');
  const quiz = document.getElementById('quiz');
  let active;
  function clear() {
    active = null;
    excerpt.value = question.value = '';
  }
  function updateDraft() {
    if (active) setDraft(reading.buildPrompt(active, excerpt.value.trim(), question.value.trim()));
  }
  function selected(target) {
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) return '';
    return reading.getExcerpt(target, selection.getRangeAt(0));
  }

  excerpt.addEventListener('input', updateDraft);
  question.addEventListener('input', updateDraft);
  for (const target of targets) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = supplement ? 'ai-trigger read-pane' : 'ai-trigger';
    button.setAttribute('data-reading-ai', '');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', dialog.id);
    button.textContent = 'AI에게 이 내용 질문하기';
    if (!supplement) {
      button.setAttribute('data-reading', '');
      button.hidden = Boolean(quiz?.checked);
    }
    const practice = supplement ? null : target.article.querySelector(':scope > .fact, :scope > [data-quiz-card], :scope > .tools');
    target.article.insertBefore(button, practice);
    // On touch devices or a mouse click, focus may collapse the selection before click.
    let pressedText = '';
    button.addEventListener('pointerdown', () => { pressedText = selected(target); });
    button.addEventListener('pointercancel', () => { pressedText = ''; });
    button.addEventListener('click', event => {
      active = target;
      excerpt.value = selected(target) || (event.detail ? pressedText : '');
      pressedText = '';
      question.value = '';
      get('context').textContent = [target.subject, target.chapter].filter(Boolean).join(' · ');
      get('mode').textContent = target.title;
      get('help').textContent = '읽던 본문으로 질문을 만들었습니다. 문장이나 궁금한 점을 적으면 그 부분에 초점을 맞춥니다.';
      updateDraft();
      show(button);
    });
  }
  window.addEventListener('pagehide', () => {
    if (dialog.open) dialog.close();
    clear();
    setDraft('');
  });
})();
