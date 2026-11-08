// Run with jsdom available through NODE_PATH, as for scripts/law-notes/check.cjs.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '../..');
const dir = path.join(root, '법인세_전범위_압축회독');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'additions.json'), 'utf8'));
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const anchor = (href, label) => `<a href="${escape(href)}"${href.startsWith('https:') ? ' target="_blank" rel="noopener"' : ''}>${escape(label)}</a>`;

for (const item of data.items) {
  const [file, id] = item.target.split('#');
  assert(/^part\d{2}\.html$/.test(file) && /^p\d+[a-z]?$/.test(id));
  const filePath = path.join(dir, file);
  const html = fs.readFileSync(filePath, 'utf8');
  const pattern = new RegExp(`<article\\b[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?<\\/article>`);
  const original = html.match(pattern)?.[0];
  assert(original, item.target);
  const dom = new JSDOM(original);
  const article = dom.window.document.querySelector('article');
  const previous = article.querySelector('[data-corporate-exam-support]');
  previous?.remove();
  for (const change of item.replaceParagraphs || []) {
    const p = [...article.querySelectorAll('.rule-more > .solution > p')].find(p => p.textContent.startsWith(change.startsWith));
    assert(p || previous, `Missing original paragraph: ${item.target} ${change.startsWith}`);
    if (p && change.remove) p.remove();
  }
  for (const change of item.replaceText || []) {
    assert(article.innerHTML.includes(change.from) || article.innerHTML.includes(change.to), `Missing original text: ${item.target}`);
    article.innerHTML = article.innerHTML.replace(change.from, change.to);
  }
  const solution = article.querySelector(':scope > details.rule-more > .solution');
  assert(solution, `Missing expandable body: ${item.target}`);
  const questions = item.questions.map(q => anchor(`exam.html#q${q}`, q.replace('-', '년 ') + '번')).join(' · ');
  const refs = item.refs.map(([source, label]) => anchor(data.sources[source] || source, label)).join(' · ');
  const rows = item.rows?.length ? `<figure class="rule-diagram" data-ai-reading><figcaption>${escape(item.title)}</figcaption><dl class="rule-compare">${item.rows.map(([condition, result]) => `<div><dt>${escape(condition)}</dt><dd>${escape(result)}</dd></div>`).join('')}</dl></figure>` : `<p><b>${escape(item.title)}</b></p>`;
  const block = `<div data-corporate-exam-support="${id}">${rows}${(item.paragraphs || []).map(p => `<p>${escape(p)}</p>`).join('')}<p class="source-note">출제 연결 · ${questions}<br>근거 · ${refs}${item.note ? `<br>${escape(item.note)}` : ''}</p></div>`;
  solution.insertAdjacentHTML('beforeend', block);
  fs.writeFileSync(filePath, html.replace(pattern, () => article.outerHTML));
}
for (const change of data.examClarifications || []) {
  for (const file of change.files) {
    const target = path.join(dir, file);
    let html = fs.readFileSync(target, 'utf8');
    if (!html.includes(change.to)) {
      assert(html.includes(change.from), `Missing exam wording: ${file}`);
      html = html.replaceAll(change.from, change.to);
      fs.writeFileSync(target, html);
    }
  }
}
const review = JSON.parse(fs.readFileSync(path.join(__dirname, 'review.json'), 'utf8'));
const exam = new JSDOM(fs.readFileSync(path.join(dir, 'exam.html'), 'utf8')).window.document;
const labels = {existing:'기존 본문 규칙', supplemented:'조건·산식 보강', conditional:'조건별 계산·별도 검토', premise:'기출 전제 읽기'};
const bodyLink = target => {
  const [file,id] = target.split('#');
  const d = new JSDOM(fs.readFileSync(path.join(dir,file),'utf8')).window.document;
  const a = d.getElementById(id);
  assert(a, target);
  return anchor(file+'?mode=read#'+id, a.querySelector('h3')?.textContent || id);
};
const sections = review.years.map(year => `<section class="panel" id="year-${year}"><h2>${year}년</h2><div class="intro-table"><table><thead><tr><th scope="col">문항</th><th scope="col">본문 연결</th><th scope="col">확인할 내용</th></tr></thead><tbody>${review.questions.filter(q => q.id.startsWith(year+'-')).map(q => {
  const problem = exam.getElementById('q'+q.id); assert(problem,q.id);
  const title = problem.querySelector('h2').textContent;
  return `<tr><td>${anchor('exam.html#q'+q.id, q.id.split('-')[1]+'번 · '+title)}<p class="sub">${labels[q.status]}</p></td><td>${q.body.map(bodyLink).join('<br>')}</td><td>${q.supplements.length ? q.supplements.map(escape).join('<br>') : '연결된 본문의 일반 규칙·산식으로 대조합니다.'}${q.note ? `<p class="sentence-note">${escape(q.note)}</p>` : ''}</td></tr>`;
}).join('')}</tbody></table></div></section>`).join('');
const report = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>법인세 · 기출 조건 대조표</title><link rel="stylesheet" href="../assets/study.css"><link rel="stylesheet" href="../assets/corp-intro.css"><script src="../assets/appearance.js"></script><script defer src="../assets/study.js"></script></head><body class="study"><main><nav class="top" data-theme-controls><a href="index.html">← 법인세 목차</a><a href="exam.html">기출 연습</a><a href="../index.html">세법 공부</a></nav><header class="hero"><div class="kicker">법인세 / 본문 근거 점검</div><h1>기출 조건 대조표</h1><p>기출에 쓰인 판단 조건과 산식이 압축노트의 어디에 있는지 확인하세요.</p></header><section class="panel"><h2>${review.years[0]}~${review.years.at(-1)}년 · ${review.questions.length}문항</h2><p>2026년 11월 1일 기준으로 대조했습니다. 기출에 쓰인 조건과 산식은 각 항목의 <b>세부 요건·사례 더 보기</b>에 정리했습니다.</p><p>본문의 일반 규칙으로 선지의 O·X와 계산 금액을 설명할 수 있는지 확인합니다. 교재의 계산원리·기본통칙은 법령과 출처를 구분했습니다.</p><p class="sentence-note">5개년 80% 목표의 최종 평가는 추가 연도 검토 후 진행합니다. 현재는 위의 4개년 점검 자료입니다.</p></section><nav class="anchors" aria-label="기출 연도">${review.years.map(y=>anchor('#year-'+y,y+'년')).join('')}</nav>${sections}<section class="panel"><h2>기준 법령</h2><p>${anchor(data.sources.law,'법인세법 · 2026.7.1. 시행본')}<br>${anchor(data.sources.decree,'시행령 · 2026.10.1. 시행본')}<br>${anchor(data.sources.rules,'시행규칙 · 2026.7.1. 시행본')}</p><p>과거 시험의 정답 번호와 현행 규정에 따른 답이 달라지는 문항은 별도 메모로 표시했습니다. 출제 원문은 각 기출 문제의 시험지 링크에서 확인할 수 있습니다.</p></section><footer>본문 근거 점검 · ${review.reviewedAt} 확인</footer></main></body></html>`;
fs.writeFileSync(path.join(dir,'exam-coverage.html'),report);
const indexPath = path.join(dir,'index.html');
let index = fs.readFileSync(indexPath,'utf8');
const panel = `<section class="panel" id="exam-support-info"><h2>기출에 나온 시행령·시행규칙</h2><p>기출을 풀 때 필요한 조건·산식을 각 항목의 <b>세부 요건·사례 더 보기</b>에 보강했습니다. 본문에서 판단 조건을 읽은 뒤 연결된 기출로 확인하세요.</p><div class="tools"><a href="exam-coverage.html">4개년 기출 조건 대조표</a></div><p class="sub">현재 점검 범위: 2022~2025년 40문항. 5개년 80% 목표의 최종 점검은 추가 연도 검토 후 구분하여 표시합니다.</p></section>`;
if(index.includes('id="exam-support-info"')) index=index.replace(/<section class="panel" id="exam-support-info">[\s\S]*?<\/section>/,panel);
else index=index.replace('</header>','</header>'+panel);
fs.writeFileSync(indexPath,index);
console.log(`Applied ${data.items.length} focused supplements; baseline ${data.baseline}`);
