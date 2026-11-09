const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '../..');
const dir = path.join(root, '법인세_전범위_압축회독');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'core.json'), 'utf8'));
// Keep this archived review sample tied to the pre-redesign source.
const original = require('node:child_process').execFileSync('git', ['show', '95da3ce4d15c41bc45c47118f6a1b645d704bd93:법인세_전범위_압축회독/part01.html'], {cwd:root,encoding:'utf8',maxBuffer:20e6});
const dom = new JSDOM(original), doc = dom.window.document;
const E = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const file = 'part01-core-sample.html';
assert.equal(data.units.length, 14);
doc.title = '총칙 · 필수 암기층 샘플 | 법인세 공부';
doc.body.classList.add('core-sample');
doc.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="../assets/corp-core-sample.css">');
doc.querySelector('.hero .kicker').textContent = '법인세 / 제1편 총설 · 초기 검토 샘플';
doc.querySelector('.hero h1').textContent = '총칙 · 필수 암기층';
doc.querySelector('.hero p').textContent = '교재 3~22쪽 · 14개 항목 · 적용 대상에서 처리 결과까지';
const notice = doc.querySelector('main > .panel');
notice.classList.add('sample-note');
notice.innerHTML = '<p><strong>먼저 볼 내용</strong>　적용 대상 → 판단 조건 → 숫자·기간 → 처리 결과 → 직접 근거</p><p>조건과 결과를 먼저 읽고, 이유가 궁금하면 아래의 세부 요건·사례를 펼치세요.</p><small>판단 기준 2026.11.1. · 법인세법 제1~12조와 교재 3~22쪽을 중심으로 구성</small><nav class="tools"><a href="part01.html">개편된 총칙 열기</a><a href="#p15">사업연도 변경 예시 ↓</a><a href="../법인세법_총칙_판단지도_2027.html#appendix">2027 개정 확인 부록</a></nav>';
// Keep the existing practice guide available without preceding the core notes with it.
const guide = doc.querySelector('.sentence-guide');
const foldedGuide = doc.createElement('details');
foldedGuide.className = 'panel sentence-guide';
foldedGuide.setAttribute('data-reading','');
foldedGuide.innerHTML = '<summary>기존 기출·예상 선지 연습 안내</summary>'+guide.innerHTML;
guide.replaceWith(foldedGuide);
for (const u of data.units) {
  const article = doc.getElementById(u.id); assert(article, u.id);
  const details = article.querySelector(':scope > .rule-more'); assert(details);
  const oldSolution = details.querySelector(':scope > .solution'); assert(oldSolution);
  const intro = [...article.children].filter(el => el!==details && !el.matches('small,h3,.tools,nav'));
  const introHTML = intro.map(el=>el.outerHTML).join('');
  intro.forEach(el=>el.remove());
  oldSolution.insertAdjacentHTML('afterbegin',introHTML);
  details.open = false;
  const nums = u.numbers.length ? `<div class="core-numbers"><div class="core-label">숫자·기간</div><dl>${u.numbers.map(n=>`<div><dt>${E(n.label)}</dt><dd>${E(n.value)}</dd></div>`).join('')}</dl></div>` : '';
  const refs = u.refs.map(r=>`<a href="${E(r.url)}" target="_blank" rel="noopener">${E(r.label)}</a>`).join(' · ');
  const core = `<figure class="core-sheet" data-ai-reading data-core="${u.id}"><figcaption>먼저 익힐 판단 기준</figcaption><div class="core-scope"><span class="core-label">적용 대상</span><span>${E(u.scope)}</span></div><div class="core-grid-head" aria-hidden="true"><span>판단 조건</span><span></span><span>처리 결과</span></div><dl class="core-branches">${u.branches.map(b=>`<div class="core-branch"><dt>${E(b.when)}</dt><dd aria-hidden="true">→</dd><dd>${E(b.then)}</dd></div>`).join('')}</dl>${nums}<p class="core-conclusion"><b>한 줄로 정리</b>${E(u.takeaway)}</p><p class="core-sources"><span>직접 근거</span>${refs}</p></figure>`;
  details.insertAdjacentHTML('beforebegin',core);
  article.querySelector(':scope > small').insertAdjacentHTML('beforeend',` <a class="sample-original" href="part01.html#${u.id}">개편된 정식 노트 ↗</a>`);
}
// Internal reading/practice jumps stay within the sample, while other chapters stay original.
for(const a of doc.querySelectorAll('a[href]')){
  const href=a.getAttribute('href');
  if(/^part01\.html(?:\?[^#]*)?#/.test(href) && !a.classList.contains('sample-original')) a.setAttribute('href',href.replace(/^part01\.html/,file));
}
doc.querySelector('main > footer').textContent = '법인세 총칙 · 필수 암기층 구성 샘플 · 2026.11.1. 판단 기준. 기존 교재 순서와 기출·예상 선지 유지.';
fs.writeFileSync(path.join(dir,file),dom.serialize());
console.log('Created separate sample: 14 core units; original notes and practice preserved.');
