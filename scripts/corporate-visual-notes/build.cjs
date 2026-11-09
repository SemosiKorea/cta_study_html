const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'법인세_전범위_압축회독');
const files=['part01.json','part02-03.json','part04-06.json','part07-09.json'];
const all=files.flatMap(f=>JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8')).units);
const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich=s=>E(s).replace(/(?:\d[\d,.]*\s*(?:억원|만원|원|개월|년|일|%)(?:\s*(?:이내|미만|이하|이상|초과))?|이내|미만|이하|이상|초과)/g,s=>`<strong class="visual-key">${s}</strong>`);
const compare=rows=>`<dl class="visual-compare">${rows.map(r=>`<div><dt>${rich(r.when)}</dt><dd>${rich(r.then)}</dd></div>`).join('')}</dl>`;
function diagram(d){
 const rows=d.rows||[];
 if(d.type==='matrix'){
   assert(d.columns?.length>=2&&d.cells?.length);
   const table=`<div class="${d.columns.length>3?'intro-table':'visual-matrix'}"><table><thead><tr>${d.columns.map(x=>`<th scope="col">${E(x)}</th>`).join('')}</tr></thead><tbody>${d.cells.map(row=>{assert.equal(row.length,d.columns.length);return `<tr>${row.map((x,i)=>i===0?`<th scope="row">${rich(x)}</th>`:`<td>${rich(x)}</td>`).join('')}</tr>`}).join('')}</tbody></table></div>`;
   return table+(rows.length?`<h4 class="visual-group-title">${E(d.rowsLabel||'함께 확인할 조건')}</h4>${compare(rows)}`:'');
 }
 assert(rows.length,d.caption);
 if(d.type==='compare')return compare(rows);
 if(d.type==='steps')return `<ol class="visual-steps${rows.length===3&&!rows.some(r=>r.branches)?' short':''}">${rows.map(r=>`<li><h4>${rich(r.when)}</h4><p>${rich(r.then)}</p>${r.branches?`<div class="visual-subbranches">${compare(r.branches)}</div>`:''}</li>`).join('')}</ol>`;
 if(d.type==='decision')return `<ol class="visual-decision">${rows.map(r=>`<li><h4>${rich(r.when)}</h4><div class="visual-outcomes"><div><b>${r.otherwise?'해당하면':'결론'}</b>${rich(r.then)}</div>${r.otherwise?`<div><b>해당하지 않으면</b>${rich(r.otherwise)}</div>`:''}</div></li>`).join('')}</ol>`;
 if(d.type==='timeline')return `<div class="visual-timeline">${rows.map(r=>`<div class="visual-time-case"><h4>${rich(r.when)}</h4>${r.track?`<div class="visual-track" aria-label="기간 구간">${r.track.map(t=>`<span class="track-${E(t.kind||'period')}">${E(t.text)}</span>`).join('')}</div>`:''}<p>${rich(r.then)}</p></div>`).join('')}</div>`;
 throw Error('Unknown diagram '+d.type);
}
assert.equal(all.length,177);
assert.equal(new Set(all.map(u=>u.file+'#'+u.id)).size,177);
const inventory=[];
for(let n=1;n<=9;n++){
 const file=`part${String(n).padStart(2,'0')}.html`,fp=path.join(dir,file),dom=new JSDOM(fs.readFileSync(fp,'utf8')),doc=dom.window.document;
 const units=all.filter(u=>u.file===file),articles=[...doc.querySelectorAll('article.item')];
 assert.deepEqual(units.map(u=>u.id),articles.map(a=>a.id),file);
 doc.body.classList.add('corporate-visual');
 if(!doc.querySelector('link[href*="corporate-visual.css"]'))doc.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="../assets/corporate-visual.css">');
 // A compact guide replaces the repeated opening instructions; full guidance remains expandable.
 doc.querySelectorAll('main > details.visual-guide').forEach(el=>el.remove());
 for(const panel of [...doc.querySelectorAll('main > div.panel[data-reading]:not(.visual-guide)')]){
  const more=doc.createElement('details');for(const attr of panel.attributes)more.setAttribute(attr.name,attr.value);
  more.innerHTML=`<summary>${panel.classList.contains('sentence-guide')?'기출·예상 선지 연습 안내':'자료 기준과 읽는 방법'}</summary>`+panel.innerHTML;panel.replaceWith(more);
 }
 if(!doc.getElementById('visual-guide'))doc.querySelector('main > header').insertAdjacentHTML('afterend','<div class="panel visual-guide" id="visual-guide" data-reading><p><b>짧은 비유 → 판단 도표 → 조건과 근거</b></p><p>비유는 이해를 돕는 설명입니다. 답을 고를 때는 도표의 법정 요건·숫자·기한을 적용하세요. 조문 원문과 추가 설명은 아래에서 펼칠 수 있습니다.</p></div>');
 for(const u of units){
  const a=doc.getElementById(u.id),more=a.querySelector(':scope > details.rule-more');assert(more,u.id);
  const solution=more.querySelector(':scope > .solution');assert(solution,u.id);
  a.querySelector(':scope > [data-corp-visual]')?.remove();
  if(!solution.querySelector(':scope > [data-original-explanation]')){
   const intro=[...a.children].filter(el=>el.matches('blockquote.law-excerpt,p:not(.tools),figure.rule-diagram'));
   const holder=doc.createElement('div');holder.setAttribute('data-original-explanation','');intro.forEach(el=>holder.append(el));solution.prepend(holder);
  }
  more.open=false;
  const refs=u.refs||[];assert(refs.length,u.id+' refs');
  const html=`<figure class="visual-note" data-ai-reading data-corp-visual="${u.id}" data-visual-type="${E(u.diagram.type)}"><figcaption>${E(u.diagram.caption)}</figcaption><p class="visual-analogy"><span class="visual-label">이렇게 이해하기</span>${E(u.analogy)}</p>${u.diagram.lead?`<p class="visual-lead">${rich(u.diagram.lead)}</p>`:''}${diagram(u.diagram)}${u.focus?`<p class="visual-focus"><span class="visual-label">놓치기 쉬운 조건</span>${rich(u.focus)}</p>`:''}<p class="visual-refs"><span>판단 근거</span>${refs.map(r=>`<a href="${E(r.url)}"${r.url.startsWith('https:')?' target="_blank" rel="noopener"':''}>${E(r.label)}</a>`).join(' · ')}</p></figure>`;
  more.insertAdjacentHTML('beforebegin',html);
  inventory.push({file,id:u.id,type:u.diagram.type});
 }
 fs.writeFileSync(fp,dom.serialize());
}
const indexPath=path.join(dir,'index.html');let index=fs.readFileSync(indexPath,'utf8');
const panel='<section class="panel" id="visual-notes-info"><h2>도표로 읽는 법인세</h2><p>교재 순서를 따라 177개 항목을 비교표·판단 순서·기간 도식으로 정리했습니다. 짧은 비유로 원리를 잡고, 도표의 조건과 직접 근거로 결론을 확인하세요.</p><nav class="tools"><a href="part01.html#p9">법인 유형 비교표</a><a href="part01.html#p16">사업연도 기간 도식</a><a href="part03.html#p215">기업업무추진비 계산</a></nav></section>';
if(index.includes('id="visual-notes-info"'))index=index.replace(/<section class="panel" id="visual-notes-info">[\s\S]*?<\/section>/,panel);else index=index.replace('</header>','</header>'+panel);
fs.writeFileSync(indexPath,index);
const counts=inventory.reduce((a,u)=>(a[u.type]=(a[u.type]||0)+1,a),{});
fs.writeFileSync(path.join(__dirname,'inventory.json'),JSON.stringify({baseline:'2026-11-01',units:inventory,counts},null,2)+'\n');
console.log('Applied visual notes to 177 units:',counts);
