const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const YAML = require('yaml');
const root = path.resolve(__dirname, '../..');
const dir = path.join(root, '법인세_전범위_압축회독');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'exam-2021.json'), 'utf8'));
const original = JSON.parse(fs.readFileSync(path.join(__dirname, 'originals-2021.json'), 'utf8'));
const E = text => String(text).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const A = (href,label,extra='') => `<a href="${E(href)}"${extra}>${E(label)}</a>`;
const external = ' target="_blank" rel="noopener"';
const noteLink = target => {
  const [file,id] = target.split('#');
  const d = new JSDOM(fs.readFileSync(path.join(dir,file),'utf8')).window.document;
  const article = d.getElementById(id); assert(article,target);
  return A(file+'?mode=read#'+id,article.querySelector('h3')?.textContent||id);
};
const cards = [];
const sections = data.questions.map(q=>{
  const id='q2021-'+q.number, o=original.questions.find(x=>x.number===q.number);
  assert(o && q.facts.length && q.bodyTargets.length);
  const source=A('pdf/exam-2021.pdf#page='+o.page,`2021년 ${q.number}번 시험지 ${o.page}쪽`,` data-preview="../assets/pages/exam-2021-${o.page}.webp" title="2021년 ${q.number}번 원문"${external}`);
  const body=q.bodyTargets.map(noteLink).join(' · ');
  const refs=q.refs.map(r=>A(r.url,r.label,external)).join(' · ');
  const sourceText=`2021년 제58회 세무사 1차 · 세법학개론 ${q.number}번 · ${q.title} | 판단 기준 2026.11.1. | ${q.refs.map(r=>r.label).join(' · ')} | ${original.sourcePaperPost}`;
  const cardBase={type:'ox',subject:'세법학개론',unit:'법인세 2021기출 · '+q.title,choices:['O','X','?'],source:sourceText,referenceYear:2026};
  let html=`<section class="problem" id="${id}" data-exam-year="2021"><div class="serial">2021년 ${q.number}번　/　${q.type==='calculation'?'계산':'선지 판단'}</div><h2>${E(q.title)}</h2><p>${E(q.prompt)}</p>${q.scopeNote?`<p>${E(q.scopeNote)}</p>`:''}<small>${source}</small><div class="fact"><b>문제 자료</b><ul>${q.facts.map(f=>`<li>${E(f)}</li>`).join('')}${q.type==='calculation'?`<li>${o.options.map(x=>E(x.label+' '+x.text)).join('　')}</li>`:''}</ul></div>`;
  if(q.type==='calculation'){
    const calc=q.calculation; assert(calc.fields.length && calc.steps.length && calc.check);
    html+=`<fieldset class="calc-entry"><legend>내 답</legend><div class="calc-fields">${calc.fields.map((f,i)=>`<div><label for="${id}-answer-${i+1}">${E(f.label)} <span>(${E(f.unit)})</span></label><input id="${id}-answer-${i+1}" type="text" autocomplete="off" inputmode="decimal" data-unit="${E(f.unit)}" placeholder="숫자 입력"></div>`).join('')}</div><button class="read-button" type="button" data-calc-reset hidden>다시 풀기</button></fieldset><details class="calc-reveal"><summary>내 답과 현행 정답·산식 비교</summary><div class="solution"><div class="calc-compare"><h3>답 비교</h3>${calc.fields.map((f,i)=>`<h4>${E(f.label)}</h4><dl class="calc-values"><div><dt>내 답</dt><dd><output for="${id}-answer-${i+1}" aria-live="off">미입력</output></dd></div><div><dt>현행 정답</dt><dd>${E(f.answer)}</dd></div><div><dt>산식·근거</dt><dd>${E(f.formula)}</dd></div></dl>`).join('')}</div><h3>풀이 과정</h3><ol>${calc.steps.map(x=>`<li>${E(x)}</li>`).join('')}</ol><p class="result">${E(calc.result)}</p>${calc.note?`<p>${E(calc.note)}</p>`:''}</div></details>`;
    cards.push({...cardBase,statement:[q.prompt,q.scopeNote,...q.facts,'**검산 O·X**　'+calc.check.statement].filter(Boolean).join('\n\n'),answer:calc.check.answer,rationale:['**현행 계산 결과**　'+calc.result,...calc.steps.map((x,i)=>(i+1)+'. '+x),calc.note,'**검산 '+calc.check.answer+'**　'+calc.check.reason].filter(Boolean).join('\n\n'),tags:['법인세','법인세기출50','계산검산','2021기출']});
  }else{
    assert.equal(q.options.length,5);
    html+=`<p class="ox-instruction">현행 세법 기준으로 각 학습문장을 O·X로 판단하세요.</p>`+q.options.map((opt,i)=>{
      assert(['O','X'].includes(opt.answer));
      cards.push({...cardBase,statement:[q.scopeNote,...q.facts,opt.text].filter(Boolean).join('\n\n'),answer:opt.answer,rationale:opt.reason,source:sourceText+' · '+opt.label,tags:['법인세','법인세기출50','선지OX','2021기출']});
      return `<div class="option" id="${id}-${E(opt.label)}"><b>${E(opt.label)}</b>　${E(opt.text)}<details><summary>O·X와 근거 보기</summary><div class="solution"><strong>${opt.answer}</strong>　${E(opt.reason)}<p>${body}</p></div></details></div>`;
    }).join('');
  }
  html+=`<details><summary>근거 조문과 교재 위치</summary><p>${E(q.basisSummary)}</p><p>${refs}</p><p>${body}</p></details><details><summary>원문과 2021년 공식 당시 정답</summary><div class="solution"><p>공식 당시 정답: ${E(o.officialAnswer)} ${E(o.officialAnswerText)}. 현재 적용 규정에 따른 위 풀이와 구분합니다.</p>${q.modernization?`<p>${E(q.modernization)}</p>`:''}<p>${source} · ${A('pdf/exam-2021-final-answer.hwp','공식 최종정답 HWP',external)} · ${A('../assets/pages/exam-2021-answer.webp','공식 최종정답 이미지',` data-preview="../assets/pages/exam-2021-answer.webp" title="2021년 1교시 A형 공식 최종정답"${external}`)}</p><p>${A(original.sourcePaperPost,'한국산업인력공단 Q-Net 시험지',external)} · ${A(original.sourceAnswerPost,'공식 최종정답 게시글',external)}</p></div></details><nav class="tools" aria-label="연결 단원">${body}</nav></section>`;
  return html;
}).join('\n');
assert.equal(cards.length,30);
const examPath=path.join(dir,'exam.html');let exam=fs.readFileSync(examPath,'utf8');
const nav=`<nav class="anchors" aria-label="2021년 기출"><b>2021년　</b>${data.questions.map(q=>A('#q2021-'+q.number,q.number+'번')).join('')}</nav>`;
exam=exam.replace(/<nav class="anchors" aria-label="2021년 기출">[\s\S]*?<\/nav>\n?/g,'').replace(/<section class="problem" id="q2021-\d+"[\s\S]*?<\/section>\n?/g,'');
exam=exam.replace(/<nav class="anchors" aria-label="2022년 기출">/,nav+'\n<nav class="anchors" aria-label="2022년 기출">');
exam=exam.replace(/<section class="problem" id="q2022-61">/,sections+'\n<section class="problem" id="q2022-61">');
if(!exam.includes('id="source-2021-credit"'))exam=exam.replace('<footer>',`<p class="sub" id="source-2021-credit">2021년 원문·정답 출처: ${A(original.sourcePaperPost,'한국산업인력공단 Q-Net',external)} · 공공누리 제1유형(출처표시). 문장형은 현행법 학습용 O·X 문장으로 재구성했으며 원문은 시험지에서 확인할 수 있습니다.</p><footer>`);
fs.writeFileSync(examPath,exam);
// Keep the textbook order and reading IDs; add only reciprocal practice links.
const byTarget = new Map();
for (const q of data.questions) for (const target of q.bodyTargets) {
  if (!byTarget.has(target)) byTarget.set(target, []);
  byTarget.get(target).push(q);
}
for (const [target, questions] of byTarget) {
  const [file,id] = target.split('#'), filePath = path.join(dir,file);
  let html = fs.readFileSync(filePath,'utf8');
  const pattern = new RegExp(`<article\\b[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?<\\/article>`);
  const originalArticle = html.match(pattern)?.[0]; assert(originalArticle,target);
  const dom = new JSDOM(originalArticle), article=dom.window.document.querySelector('article');
  article.querySelector('[data-exam-2021-links]')?.remove();
  article.insertAdjacentHTML('beforeend',`<nav class="tools" data-exam-2021-links aria-label="2021년 연결 기출">${questions.map(q=>A('exam.html#q2021-'+q.number,`2021년 ${q.number}번 · ${q.title}`)).join('')}</nav>`);
  fs.writeFileSync(filePath,html.replace(pattern,()=>article.outerHTML));
}
const indexPath=path.join(dir,'index.html');let index=fs.readFileSync(indexPath,'utf8');
index=index.replace('4개년 기출 40문항','5개년 기출 50문항').replace('문장형 21문항','문장형 26문항').replace('계산형 19문항','계산형 24문항');
index=index.replace(/<div data-exam-2021-directory>[\s\S]*?<\/div><\/div>/,'');
const directory=`<div data-exam-2021-directory><h3>2021년</h3><div class="anchors">${data.questions.map(q=>A('exam.html#q2021-'+q.number,q.number+'번',` title="${E(q.title)}"`)).join('')}</div></div>`;
index=index.replace('<h3>2022년</h3>',directory+'<h3>2022년</h3>');
index=index.replace(/<a href="법인세_기출(?:40|50)문항_회독웹앱.yaml" id="exam-deck-download"[^>]*>[\s\S]*?<\/a>/,`<a href="법인세_기출50문항_회독웹앱.yaml" id="exam-deck-download" download>5개년 선지·계산 156장</a>`);
index=index.replace(/<p class="sub">기출 파일은 선지 O·X 107장과 계산 19장입니다\.[\s\S]*?<\/p>/,`<p class="sub">전체 파일은 선지 O·X 132장과 계산 검산 24장입니다. 계산 카드는 금액을 구하고 검산 문장에 답하면 산식과 결과가 열립니다.</p>`);
if(!index.includes('id="exam-2021-download"'))index=index.replace('<a href="법인세_기출50문항_회독웹앱.yaml"',`<a id="exam-2021-download" href="법인세_2021추가_회독웹앱.yaml" download>2021년만 추가 · 30장</a><a href="법인세_기출50문항_회독웹앱.yaml"`);
if(!index.includes('id="exam-import-help"'))index=index.replace('</a></div><p class="sub">전체 파일',`</a></div><p id="exam-import-help">기존 4개년 126장을 가져왔다면 <b>2021년만 추가 · 30장</b>을 선택하세요. 처음 가져온다면 전체 156장을 사용하세요. <a href="법인세_기출40문항_회독웹앱.yaml" download>이전 4개년 파일</a>도 유지합니다.</p><p class="sub">전체 파일`);
fs.writeFileSync(indexPath,index);
const homePath=path.join(root,'index.html');
fs.writeFileSync(homePath,fs.readFileSync(homePath,'utf8').replace('5편 52장 · 기출 40문항','5편 52장 · 5개년 기출 50문항'));
fs.writeFileSync(path.join(dir,'법인세_2021추가_회독웹앱.yaml'),YAML.stringify({schema:'hoedok.cards/v1',cards},{lineWidth:0}));
const legacy=YAML.parse(fs.readFileSync(path.join(dir,'법인세_기출40문항_회독웹앱.yaml'),'utf8'));
assert.equal(legacy.cards.length,126);
fs.writeFileSync(path.join(dir,'법인세_기출50문항_회독웹앱.yaml'),YAML.stringify({schema:legacy.schema,cards:[...legacy.cards,...cards]},{lineWidth:0}));
console.log('2021 added: 10 questions, 25 statement OX, 5 calculation cards; combined cards 156');
