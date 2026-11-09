(() => {
  'use strict';

  const subjects = ['법인세', '소득세', '양도소득세', '부가가치세', '국세기본법', '국세징수법', '행정소송법'];
  const providers = {chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini'};
  const hosts = {
    chatgpt: ['chatgpt.com', 'www.chatgpt.com', 'app.chatgpt.com', 'chat.openai.com'],
    claude: ['claude.ai', 'www.claude.ai'],
    gemini: ['gemini.google.com']
  };
  const prefix = 'cta_study_html.ai-route.v1.';
  const script = document.currentScript;
  const subjectHere = script.dataset.subject;
  const home = new URL('../index.html', script.src);

  function normalizeURL(provider, address) {
    const value = address.trim();
    let url;
    if (!/[\\\u0000-\u001f\u007f]/u.test(value)) {
      try {
        if (/^\/(?!\/)/.test(value)) url = new URL(value, 'https://' + hosts[provider][0]);
        else if (/^https:\/\//i.test(value)) url = new URL(value);
      } catch { /* Use the same entry guidance for malformed URLs. */ }
    }
    if (!url || url.username || url.password || url.port) {
      throw new Error('AI 서비스의 https:// 주소 또는 /로 시작하는 경로를 입력하세요.');
    }
    const gemShortcut = provider === 'gemini' && url.hostname === 'g.co' && /^\/(?:gemini|gem)\//.test(url.pathname);
    if (!hosts[provider].includes(url.hostname) && !gemShortcut) {
      throw new Error(providers[provider] + ' 경로에는 해당 서비스의 주소를 입력하세요.');
    }
    return url.href;
  }

  function decode(key, raw) {
    try {
      const item = JSON.parse(raw);
      if (item && item.id && key === prefix + item.id &&
          subjects.includes(item.subject) && Object.hasOwn(providers, item.provider) &&
          typeof item.label === 'string' && item.label.trim() && typeof item.url === 'string') {
        return {...item, url: normalizeURL(item.provider, item.url)};
      }
    } catch { /* Ignore an invalid saved entry and continue to offer other routes. */ }
    return null;
  }

  function list(subject) {
    try {
      const entries = [];
      for (const key of Object.keys(localStorage)) {
        if (!key.startsWith(prefix)) continue;
        const item = decode(key, localStorage.getItem(key));
        if (item?.subject === subject) entries.push(item);
      }
      return entries.sort((a, b) => a.provider.localeCompare(b.provider) || a.label.localeCompare(b.label, 'ko', {numeric: true}));
    } catch {
      throw new Error('이 브라우저에서 저장한 경로를 읽을 수 없습니다. 사이트 데이터 설정을 확인하세요.');
    }
  }

  function save({id, subject, provider, label, url}) {
    if (!subjects.includes(subject) || !Object.hasOwn(providers, provider)) throw new Error('과목과 AI를 선택하세요.');
    const address = normalizeURL(provider, url);
    const entries = list(subject);
    if (id && !entries.some(item => item.id === id)) throw new Error('수정할 경로가 사라졌습니다. 목록을 다시 확인하세요.');
    const other = entries.filter(item => item.provider === provider && item.id !== id);
    if (other.some(item => item.url === address)) throw new Error('이 과목에 이미 추가한 주소입니다.');
    let name = label.trim();
    if (!name) {
      name = '지정 경로';
      let suffix = 1;
      while (other.some(item => item.label === name)) name = '지정 경로 ' + (++suffix);
    } else if (other.some(item => item.label === name)) {
      throw new Error('같은 과목과 AI에 이미 이 이름이 있습니다. 경로를 구분할 이름을 입력하세요.');
    }
    const entry = {id: id || Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-'),
      subject, provider, label: name, url: address};
    try {
      localStorage.setItem(prefix + entry.id, JSON.stringify(entry));
    } catch {
      throw new Error('경로를 저장하지 못했습니다. 브라우저의 저장 공간과 사이트 데이터 설정을 확인하세요.');
    }
    return entry;
  }

  function remove(id) {
    try {
      localStorage.removeItem(prefix + id);
    } catch {
      throw new Error('이 브라우저에서 경로를 삭제할 수 없습니다.');
    }
  }

  function homeURL(subject) {
    const url = new URL(home);
    if (subjects.includes(subject)) url.searchParams.set('subject', subject);
    url.hash = 'ai-routes';
    return url.href;
  }
  window.CTAStudyRoutes = {subjects, providers, list, save, remove, homeURL,
    currentSubject: () => subjects.includes(subjectHere) ? subjectHere : '',
    isStorageKey: key => typeof key === 'string' && key.startsWith(prefix)};
})();
