(() => {
  'use strict';

  const routes = window.CTAStudyRoutes;
  const get = name => document.getElementById('route-' + name);
  const subject = get('subject');
  const provider = get('provider');
  const label = get('label');
  const url = get('url');
  const status = get('status');
  const list = get('list');
  const empty = get('empty');
  let editing = null;

  for (const name of routes.subjects) subject.add(new Option(name, name));
  for (const [key, name] of Object.entries(routes.providers)) provider.add(new Option(name, key));
  const requested = new URL(location.href).searchParams.get('subject');
  if (routes.subjects.includes(requested)) subject.value = requested;

  function clearEditor() {
    editing = null;
    label.value = '';
    url.value = '';
    get('save').textContent = '경로 추가';
    get('cancel').hidden = true;
  }

  function edit(route) {
    editing = route;
    provider.value = route.provider;
    label.value = route.label;
    url.value = route.url;
    get('save').textContent = '수정 저장';
    get('cancel').hidden = false;
    status.textContent = route.label + ' 경로를 수정합니다.';
    label.focus();
  }

  function remove(route) {
    try {
      routes.remove(route.id);
      if (editing?.id === route.id) clearEditor();
      status.textContent = route.label + ' 경로를 삭제했습니다.';
      refreshList();
      (list.querySelector('button') || provider).focus();
    } catch (error) {
      status.textContent = error.message;
    }
  }

  function row(route) {
    const li = document.createElement('li');
    const details = document.createElement('div');
    const name = document.createElement('strong');
    const address = document.createElement('small');
    name.textContent = routes.providers[route.provider] + ' · ' + route.label;
    address.textContent = route.url;
    details.append(name, address);
    const actions = document.createElement('div');
    actions.className = 'route-actions';
    for (const [text, handler] of [['수정', edit], ['삭제', remove]]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'read-button';
      button.textContent = text;
      button.setAttribute('aria-label', name.textContent + ' ' + text);
      button.addEventListener('click', () => handler(route));
      actions.append(button);
    }
    li.append(details, actions);
    return li;
  }

  function refreshList() {
    get('list-heading').textContent = subject.value + '에 등록한 경로';
    try {
      const entries = routes.list(subject.value);
      list.replaceChildren(...entries.map(row));
      empty.textContent = '이 과목에 등록한 경로가 없습니다.';
      empty.hidden = entries.length > 0;
      if (editing) {
        const current = entries.find(entry => entry.id === editing.id);
        if (!current || current.url !== editing.url || current.label !== editing.label || current.provider !== editing.provider) {
          clearEditor();
          status.textContent = '등록된 경로가 변경되었습니다. 목록에서 경로를 다시 선택하세요.';
        }
      }
    } catch (error) {
      list.replaceChildren();
      empty.hidden = true;
      status.textContent = error.message;
    }
  }

  subject.addEventListener('change', () => {
    clearEditor();
    status.textContent = '';
    refreshList();
  });
  get('form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const saved = routes.save({id: editing?.id, subject: subject.value,
        provider: provider.value, label: label.value.trim(), url: url.value.trim()});
      status.textContent = saved.subject + '에 ' + saved.label + ' 경로를 저장했습니다.';
      clearEditor();
      refreshList();
    } catch (error) {
      status.textContent = error.message;
    }
  });
  get('cancel').addEventListener('click', () => {
    clearEditor();
    status.textContent = '수정을 취소했습니다.';
    provider.focus();
  });
  window.addEventListener('pageshow', refreshList);
  window.addEventListener('storage', event => {
    if (event.key === null || routes.isStorageKey(event.key)) refreshList();
  });
  get('controls').hidden = false;
  refreshList();
})();
