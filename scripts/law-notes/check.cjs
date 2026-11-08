const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..'),docs=new Map();
const doc=p=>{if(!docs.has(p))docs.set(p,new JSDOM(fs.readFileSync(p,'utf8')).window.document);return docs.get(p)};
const units=JSON.parse(fs.readFileSync(path.join(root,'assets/units.js'),'utf8').replace(/^window.CTA_UNITS = /,'').replace(/;\s*$/,''));
assert.equal(new Set(units.map(u=>u.key)).size,units.length);
let totals={parts:0,items:0,predictions:0,questions:0,statements:0,links:0};
for(const slug of ['basic','collection']){
 const dir=path.join(root,slug),content=JSON.parse(fs.readFileSync(path.join(dir,'content.json'))),exams=JSON.parse(fs.readFileSync(path.join(dir,'exam-data.json')));const d=doc(path.join(dir,'exam.html'));
 assert.equal(d.querySelectorAll('section.problem').length,16);totals.questions+=16;
 for(const q of exams)for(const s of q.statements){let node=d.getElementById(q.id+'-'+s.label);assert(node,q.id+s.label);assert(node.textContent.includes(s.text));assert(['O','X','판정 보류'].includes(node.querySelector('.solution strong').textContent));assert(!node.querySelector('details').open);assert(node.querySelectorAll('.solution a[href^="https:"]').length);totals.statements++;}
 for(const [n,p] of content.parts.entries()){
  const f=`part${String(n+1).padStart(2,'0')}.html`,page=doc(path.join(dir,f));let ids=[...page.querySelectorAll('[id]')].map(x=>x.id);assert.equal(new Set(ids).size,ids.length,slug+f+' duplicate IDs');
  assert.equal(page.querySelectorAll('article.item').length,p.items.length);
  assert.equal(page.querySelectorAll('.sentence-practice').length,p.items.length);
  assert.equal(page.querySelectorAll('.sentence-prediction').length,p.items.length*2);
  for(const it of p.items){let a=page.getElementById(it.id),g=page.getElementById('sentences-'+it.id);assert(a.matches('article[data-reading]'));assert(g.matches('[data-quiz-card]'));assert(!g.closest('[data-reading]'));assert(!g.open);assert.equal(g.querySelectorAll('.sentence-answer[open]').length,0);assert.equal(a.querySelectorAll('figure.rule-diagram').length,1);assert(it.quote.text.length>=8);assert(it.details.length>=1);assert.deepEqual(it.predictions.map(x=>x.answer).sort(),['O','X']);assert(units.find(u=>u.url===slug+'/'+f+'#'+it.id));}
  totals.parts++;totals.items+=p.items.length;totals.predictions+=p.items.length*2;
 }
 for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.html'))){const page=doc(path.join(dir,f));for(const a of page.querySelectorAll('a[href]')){let h=a.getAttribute('href');if(/^https?:/.test(h))continue;let u=new URL(h,'https://site/'+slug+'/'+f),target=path.join(root,decodeURIComponent(u.pathname));assert(fs.existsSync(target),h+' from '+f);if(u.hash&&target.endsWith('.html'))assert(doc(target).getElementById(decodeURIComponent(u.hash.slice(1))),h);if(a.dataset.preview)assert(fs.existsSync(path.resolve(dir,a.dataset.preview)));totals.links++;}}
 const parseCards=file=>{let s=fs.readFileSync(path.join(dir,file),'utf8');assert(s.startsWith('schema: hoedok.cards/v1\ncards:\n'));let cards=s.split('  - type: "ox"\n').slice(1).map(t=>Object.fromEntries(t.trim().split('\n').map(l=>{let pos=l.indexOf(':');return [l.slice(0,pos).trim(),JSON.parse(l.slice(pos+1).trim())]})));for(const c of cards){assert(['O','X'].includes(c.answer));assert(c.statement&&c.rationale&&c.source);assert.deepEqual(c.choices,['O','X','?']);}return cards;};
 if(slug==='collection'){
  const q=exams.find(q=>q.id==='q2024-47'); assert(!q.referenceOnly,'47번 전체 제외 금지');
  const cards=parseCards('exam.yaml');
  for(const label of ['①','②','③','④']) assert(cards.some(c=>c.unit==='국세징수법 · 2024년 47번 '+label));
  assert(!cards.some(c=>c.unit==='국세징수법 · 2024년 47번 ⑤'));
  assert.equal(d.getElementById('q2024-47-⑤').querySelector('.solution strong').textContent,'판정 보류');
 }
 assert.equal(parseCards('book.yaml').length,content.parts.reduce((s,p)=>s+p.items.length*2,0));
assert.equal(parseCards('exam.yaml').length,exams.reduce((s,q)=>s+(q.referenceOnly?0:q.judgment.verdicts.filter(v=>v.status!=='review-needed').length),0));
 console.log(slug,'static contracts OK');
}
assert.equal(totals.statements,156);console.log(totals);
