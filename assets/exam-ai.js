(() => {
  'use strict';

  function createStudyDialog({fields, editHelp, onClose, manualChatGPT = false}) {
    const dialog = document.createElement('dialog');
    dialog.id = 'exam-ai';
    dialog.setAttribute('aria-labelledby', 'ai-mode');
    dialog.innerHTML = `
      <div class="ai-top">
        <div><small id="ai-context"></small><h2 id="ai-mode" tabindex="-1" autofocus></h2></div>
        <button type="button" id="ai-close">닫기</button>
      </div>
      <div class="ai-body">
        <p id="ai-help"></p>
        ${fields}
        <label for="ai-prompt" class="ai-step">1. 질문 확인</label>
        <p class="ai-instruction" id="ai-edit-help">${editHelp}</p>
        <textarea id="ai-prompt" rows="7" autocomplete="off" spellcheck="false" aria-describedby="ai-edit-help"></textarea>
        <div class="ai-actions">
          <button type="button" id="ai-copy">질문 복사</button>
          <button type="button" id="ai-manual" hidden>직접 복사했어요</button>
        </div>
        <p id="ai-status" role="status"></p>
        <h3 class="ai-step">2. AI 열고 붙여넣기</h3>
        <nav class="ai-providers" aria-label="학습할 AI 선택">
          <a data-url="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPT</a>
          <a data-url="https://claude.ai/" target="_blank" rel="noopener noreferrer">Claude</a>
          <a data-url="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer">Gemini</a>
        </nav>
        <p class="ai-instruction" id="ai-launch-help">질문을 복사한 뒤 원하는 AI를 열어 붙여넣으세요. 붙여넣고 전송한 내용은 해당 AI의 대화에 남을 수 있습니다.</p>
      </div>`;
    document.body.append(dialog);

    const get = id => dialog.querySelector('#ai-' + id);
    const prompt = get('prompt');
    const copy = get('copy'), manual = get('manual'), status = get('status');
    // Galaxy browsers in desktop mode may identify as touch-capable Linux.
    const androidDesktop = /Linux/i.test(navigator.userAgent) &&
      !/CrOS/i.test(navigator.userAgent) && navigator.maxTouchPoints > 0;
    if (navigator.userAgentData?.platform === 'Android' || /Android/i.test(navigator.userAgent) || androidDesktop) {
      const app = dialog.querySelector('.ai-providers a');
      if (manualChatGPT) {
        app.remove();
        get('launch-help').prepend('ChatGPT를 쓰려면 질문을 복사한 뒤 홈 화면에서 ChatGPT 앱을 열어 붙여넣으세요. ');
      } else {
        app.removeAttribute('target');
        // Use the same direct, package-scoped tap as the review app, aimed at ChatGPT home.
        app.dataset.url = app.dataset.url.replace(/^https:/, 'intent:') + '#Intent;scheme=https;package=com.openai.chatgpt;end';
        app.textContent = 'ChatGPT 앱';
        get('launch-help').prepend('ChatGPT 앱이 열리지 않거나 웹으로 돌아오면 홈 화면에서 앱을 직접 열어 복사한 질문을 붙여넣으세요. ');
      }
    }
    const links = dialog.querySelectorAll('.ai-providers a');
    let trigger;
    let revision = 0;

    function setLinks(enabled) {
      for (const link of links) {
        if (enabled) link.href = link.dataset.url;
        else link.removeAttribute('href');
        link.setAttribute('aria-disabled', String(!enabled));
      }
    }
    function requireCopy() {
      revision++;
      copy.disabled = !prompt.value.trim();
      manual.hidden = true;
      status.textContent = '';
      setLinks(false);
    }
    function copied() {
      setLinks(true);
      manual.hidden = true;
      status.textContent = '복사한 질문을 사용할 AI를 선택하세요.';
    }
    prompt.addEventListener('input', requireCopy);
    copy.addEventListener('click', async () => {
      const current = revision;
      try {
        await navigator.clipboard.writeText(prompt.value);
        if (dialog.open && current === revision) copied();
      } catch {
        if (!dialog.open || current !== revision) return;
        status.textContent = '자동 복사를 사용할 수 없습니다. 선택된 질문을 직접 복사한 뒤 ‘직접 복사했어요’를 누르세요.';
        manual.hidden = false;
        prompt.focus();
        prompt.select();
      }
    });
    manual.addEventListener('click', copied);
    get('close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      if (dialog.open) return;
      prompt.value = '';
      requireCopy();
      onClose();
      trigger?.focus({preventScroll: true});
      trigger = null;
    });

    function show(button) {
      trigger = button;
      dialog.showModal();
      dialog.scrollTop = 0;
      get('mode').focus({preventScroll: true});
    }
    function setDraft(text) {
      prompt.value = text;
      requireCopy();
    }
    return {dialog, get, setDraft, show};
  }

  window.CTAStudyDialog = createStudyDialog;
  if (!window.CTAExamAI) return;

  const {collectTargets, buildPrompt} = window.CTAExamAI;
  const {dialog, get, setDraft, show} = createStudyDialog({
    fields: `
      <label class="ai-consent"><input type="checkbox" id="ai-include" autocomplete="off"> 이 질문에 내 답 포함</label>
      <div id="ai-personal" hidden>
        <label for="ai-ox" id="ai-ox-label">이 선지에 대한 내 판단</label>
        <select id="ai-ox" autocomplete="off"><option value="">선택하세요</option><option>O</option><option>X</option></select>
        <p id="ai-calc-note"></p>
        <label for="ai-reason">내가 적용한 조건이나 식 <small>(선택)</small></label>
        <input type="text" id="ai-reason" maxlength="500" autocomplete="off" placeholder="어디까지 풀었는지 한 줄로 적으세요">
      </div>`,
    editHelp: '질문은 고쳐 쓸 수 있습니다. 위의 내 답이나 식을 바꾸면 질문이 새로 작성됩니다.',
    onClose: clearPanel
  });
  const include = get('include'), ox = get('ox'), reason = get('reason');
  let active;

  function enteredAmounts() {
    const fields = active.section.querySelectorAll('.calc-entry input, .calc-entry select');
    return [...fields].filter(field => field.value.trim()).map(field =>
      field.labels[0].textContent.trim() + ' = ' + field.value.trim());
  }
  function updatePrompt() {
    const personal = [];
    get('personal').hidden = !include.checked;
    if (include.checked) {
      if (active.option) {
        if (ox.value) personal.push('내 판단 ' + ox.value);
      } else {
        personal.push(...enteredAmounts());
        get('calc-note').textContent = personal.length ? '문제에서 입력한 항목만 질문에 담았습니다.' : '이 문제에 입력한 답이 없습니다.';
      }
      if (reason.value.trim()) personal.push('내가 적용한 조건이나 식 — ' + reason.value.trim());
    }
    setDraft(buildPrompt(active, active.seen, personal.join('\n')));
  }
  function openPanel(target) {
    active = target;
    include.checked = false;
    ox.value = '';
    reason.value = '';
    ox.hidden = get('ox-label').hidden = !target.option;
    get('calc-note').hidden = Boolean(target.option);
    const number = target.section.querySelector('.serial').textContent.split('/')[0].trim();
    const choice = target.option ? ' · ' + target.option.querySelector('b').textContent + ' 선지' : '';
    get('context').textContent = document.title.split(' 기출')[0] + ' · ' + number + choice;
    get('mode').textContent = modeName(target);
    get('help').textContent = target.seen
      ? '현행 해설과 내 풀이를 대조할 질문을 준비했습니다. 헷갈린 단계가 있으면 함께 적어 보세요.'
      : '정답과 해설을 가렸습니다. AI에게 풀이를 시작할 질문 하나를 요청합니다.';
    updatePrompt();
    show(target.button);
  }
  function clearPanel() {
    active = null;
    include.checked = false;
    ox.value = reason.value = '';
    get('personal').hidden = true;
  }

  include.addEventListener('change', () => {
    if (!include.checked) { ox.value = ''; reason.value = ''; }
    updatePrompt();
  });
  ox.addEventListener('change', updatePrompt);
  reason.addEventListener('input', updatePrompt);
  function modeName(target) { return target.seen ? '내 풀이 점검' : '힌트 한 단계'; }
  function mark(target, seen) {
    target.seen = seen;
    target.button.textContent = 'AI 학습 · ' + modeName(target);
  }
  const groups = [];
  const sharedVerdicts = new Set(['문항 전체 판정 확인', '수록 선지 판정 확인', '판단 조건과 보기 대조']);
  function track(detail, targets) {
    detail.addEventListener('toggle', () => {
      if (detail.open) targets.forEach(target => mark(target, true));
    });
  }
  function resetGroup({targets, shared}) {
    if (shared) shared.open = false;
    for (const target of targets) {
      target.reveal.open = false;
      mark(target, false);
    }
  }
  for (const section of document.querySelectorAll('section.problem')) {
    const targets = collectTargets(section);
    const shared = [...section.querySelectorAll(':scope > details')].find(detail =>
      sharedVerdicts.has(detail.querySelector('summary').textContent.trim()));
    const group = {targets, shared};
    groups.push(group);
    if (shared) track(shared, targets);
    for (const target of targets) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ai-trigger';
      button.setAttribute('data-ai-study', '');
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', 'exam-ai');
      target.button = button;
      mark(target, target.reveal.open || Boolean(shared?.open));
      target.reveal.after(button);
      track(target.reveal, [target]);
      button.addEventListener('click', () => {
        if (target.reveal.open || shared?.open) mark(target, true);
        openPanel(target);
      });
    }
    section.querySelector('[data-calc-reset]')?.addEventListener('click', () => resetGroup(group));
  }
  function clearPage() {
    if (dialog.open) dialog.close();
    clearPanel();
    setDraft('');
    groups.forEach(resetGroup);
  }
  window.addEventListener('pagehide', clearPage);
  window.addEventListener('pageshow', event => { if (event.persisted) clearPage(); });
})();
