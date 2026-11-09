const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'income'),baseline='91c30af5c1d080055899680153c5482a47756e43';
const docs=new Map(),read=p=>fs.readFileSync(p,'utf8'),doc=p=>{if(!docs.has(p))docs.set(p,new JSDOM(read(p)).window.document);return docs.get(p)},norm=s=>s.replace(/\s+/g,' ').trim();
const units=['part01','part02-03','part04-06','part07-10'].flatMap(f=>JSON.parse(read(path.join(__dirname,f+'.json'))).units);
assert.equal(units.length,175);assert.equal(new Set(units.map(u=>u.file+'#'+u.id)).size,175);
const types=new Set();let links=0,practices=0,reading=0;
for(let n=1;n<=10;n++){
 const file=`part${String(n).padStart(2,'0')}.html`,filePath=path.join(dir,file),d=doc(filePath),old=new JSDOM(execFileSync('git',['show',baseline+':income/'+file],{cwd:root,encoding:'utf8',maxBuffer:20e6})).window.document;
 const ids=[...d.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length,file);
 assert.equal(d.querySelectorAll('.visual-guide').length,1);assert.equal(d.getElementById('visual-guide').tagName,'DIV');
 assert.deepEqual([...d.querySelectorAll('article.item')].map(a=>a.id),[...old.querySelectorAll('article.item')].map(a=>a.id));
 assert.deepEqual([...d.querySelectorAll('[data-unit]')].map(a=>a.dataset.unit),[...old.querySelectorAll('[data-unit]')].map(a=>a.dataset.unit));reading+=d.querySelectorAll('[data-unit]').length;
 for(const a of old.querySelectorAll('article.item')){
  const current=d.getElementById(a.id),more=current.querySelector(':scope>.rule-more'),source=more.querySelector(':scope>.solution');
  assert.equal(current.querySelectorAll(':scope>[data-income-visual]').length,1,a.id);assert(!more.open);assert(source.querySelector('[data-original-explanation]'));
  for(const el of a.querySelectorAll(':scope>blockquote.law-excerpt,:scope>figure.rule-diagram,:scope>p:not(.tools),:scope>.rule-more>.solution'))assert(norm(source.textContent).includes(norm(el.textContent)),file+' '+a.id+' lost original '+el.tagName);
  const checks=a.querySelectorAll(':scope>.fact,:scope>details:not(.rule-more)');for(const [i,el]of [...checks].entries())assert.equal(current.querySelectorAll(':scope>.fact,:scope>details:not(.rule-more)')[i].outerHTML,el.outerHTML);
 }
 for(const oldPractice of old.querySelectorAll('.sentence-practice')){assert.equal(d.getElementById(oldPractice.id).outerHTML,oldPractice.outerHTML);practices++;}
 assert.deepEqual([...d.querySelectorAll('[data-quiz-card]')].map(x=>x.outerHTML),[...old.querySelectorAll('[data-quiz-card]')].map(x=>x.outerHTML));
 for(const u of units.filter(u=>u.file===file)){
  assert(u.analogy.length>0);types.add(u.diagram.type);const a=d.getElementById(u.id),core=a.querySelector('[data-income-visual]');assert(core.textContent.includes(u.analogy));assert.equal(core.querySelectorAll('figcaption').length,1);assert.equal(core.firstElementChild.tagName,'FIGCAPTION');assert(!/undefined|\uFFFD/.test(core.textContent));
  if(u.diagram.type==='decision')for(const r of u.diagram.rows)assert(r.otherwise||u.diagram.rows.length===1||r===u.diagram.rows.at(-1),u.id+' decision missing negative path');
  for(const r of u.refs){assert(r.label&&r.url);assert(!r.url.startsWith('/Users/'));}
 }
 for(const a of d.querySelectorAll('a[href],script[src],link[href]')){
  const href=a.getAttribute('href')||a.getAttribute('src');if(/^[a-z][a-z0-9+.-]*:/i.test(href))continue;
  const url=new URL(href,'https://local/income/'+file),target=path.join(root,decodeURIComponent(url.pathname));assert(fs.existsSync(target),file+' '+href);
  if(url.hash&&target.endsWith('.html'))assert(doc(target).getElementById(decodeURIComponent(url.hash.slice(1))),file+' '+href);links++;
 }
}
assert(types.size>=4);
for(const file of ['exam.html','book.yaml','exam.yaml'])assert.equal(read(path.join(dir,file)),execFileSync('git',['show',baseline+':income/'+file],{cwd:root,encoding:'utf8',maxBuffer:20e6}),file);
assert.equal(read(path.join(root,'assets/units.js')),execFileSync('git',['show',baseline+':assets/units.js'],{cwd:root,encoding:'utf8'}));
const oldIndex=new JSDOM(execFileSync('git',['show',baseline+':income/index.html'],{cwd:root,encoding:'utf8'})).window.document,index=doc(path.join(dir,'index.html'));
assert.equal(index.getElementById('appendix').nextElementSibling.outerHTML,oldIndex.getElementById('appendix').nextElementSibling.outerHTML);
console.log(JSON.stringify({units:175,types:[...types],preservedPracticeBlocks:practices,preservedReadingKeys:reading,checkedLocalLinks:links,originalDetails:'preserved',examsAndDecks:'unchanged'},null,2));
