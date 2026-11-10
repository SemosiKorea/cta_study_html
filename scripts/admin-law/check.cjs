const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'admin-law');
const deps=process.env.HOEDOK_NODE_MODULES||path.resolve(root,'../hoedok-desk/node_modules');
const {JSDOM}=require(path.join(deps,'jsdom'));
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.html')),docs=new Map();
assert.equal(files.length,13);
for(const f of files){const d=new JSDOM(fs.readFileSync(path.join(dir,f),'utf8')).window.document;docs.set(f,d);const ids=[...d.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length,'Duplicate IDs '+f);assert.equal(d.querySelectorAll('h1').length,1);assert.equal(d.documentElement.lang,'ko');}
let internalLinks=0;
for(const [f,d] of docs)for(const a of d.querySelectorAll('a[href],script[src],link[href],img[src]')){
 const value=a.getAttribute('href')||a.getAttribute('src');if(!value||/^(https?:|data:|mailto:)/.test(value))continue;
 const u=new URL(value,'https://local.test/admin-law/'+f),file=path.join(root,decodeURIComponent(u.pathname));
 assert.ok(fs.existsSync(file),'Missing target '+f+' '+value);internalLinks++;
 if(u.hash&&file.endsWith('.html')){const target=docs.get(path.basename(file))||new JSDOM(fs.readFileSync(file,'utf8')).window.document;assert.ok(target.getElementById(decodeURIComponent(u.hash.slice(1))),'Missing fragment '+f+' '+value);}
}
let units=0,questions=0;
for(let i=1;i<=8;i++){const d=docs.get('part'+String(i).padStart(2,'0')+'.html');assert.equal(d.querySelectorAll('.analogy .limit').length,4);assert.equal(d.querySelectorAll('[data-unit]').length,4);assert.equal(d.querySelectorAll('[data-quiz-card]').length,8);assert.equal(d.querySelectorAll('.law-original').length>0,true);units+=4;questions+=8;}
assert.equal(docs.get('exam.html').querySelectorAll('.exam-entry').length,200);
const exams=JSON.parse(fs.readFileSync(path.join(dir,'sources/exams.json'),'utf8'));
for(const q of exams){assert.ok(fs.existsSync(path.join(dir,`pages/${q.year}-${q.page}.webp`)));assert.ok(fs.existsSync(path.join(dir,`pdf/exam-${q.year}.pdf`)));}
const act=JSON.parse(fs.readFileSync(path.join(dir,'sources/act.json'),'utf8'));
assert.equal(act.articles.find(a=>a.article_number===9).paragraphs.length,3);
assert.equal(act.articles.find(a=>a.article_number===10).paragraphs.length,2);
assert.ok(docs.get('sources.html').querySelector('#act-43').textContent.includes('삭제'));
// Match the independent source inventory, not just a self-reported reviewed count.
const expectedChoices=JSON.parse(fs.readFileSync(path.join(dir,'sources/exam-choice-index.json'),'utf8'));
const audit=JSON.parse(fs.readFileSync(path.join(dir,'sources/exam-audit.json'),'utf8'));
// A direct precedent that could not be obtained must never disappear behind a
// "reviewed" count: require its precise scope on both public learning surfaces.
for(const item of audit.unresolved){
 const q=audit.questions.find(q=>q.id===item.qid);
 assert.ok(q&&item.choices.length&&item.reason&&item.lawURLs.length&&item.supplementIds.length,'Incomplete source limitation');
 for(const choice of item.choices)assert.ok(q.issues.some(issue=>issue.choices.includes(choice)&&issue.note.includes('미확인')),'Missing choice-level disclosure');
 for(const name of ['exam.html','review.html']){
  const disclosure=docs.get(name).querySelector(`[data-source-limitation="${item.qid}"]`);
  assert.ok(disclosure&&disclosure.textContent.includes(item.reason),'Missing public source disclosure '+name);
 }
}
assert.equal(audit.questions.length,200);assert.equal(new Set(audit.questions.map(q=>q.id)).size,200);
let auditedOptions=0;
for(const source of expectedChoices){
 const q=audit.questions.find(q=>q.id===source.id);assert.ok(q,'Missing audit '+source.id);
 assert.deepEqual([...q.checkedChoices].sort(),[...source.choices].sort(),'Wrong source choices '+q.id);
 const covered=new Set(q.issues.flatMap(issue=>issue.choices));
 assert.deepEqual([...covered].sort(),[...source.choices].sort(),'Uncovered choice '+q.id);
 for(const issue of q.issues){
  assert.ok(issue.note&&issue.label,'Empty issue '+q.id);assert.ok((issue.existing?.length||0)+(issue.supplementIds?.length||0)>0,'Missing learning link '+q.id);
  for(const id of issue.supplementIds||[])assert.ok(docs.get('review.html').getElementById(id),'Missing supplement '+q.id+' '+id);
  for(const href of issue.existing||[]){const [file,hash]=href.split('#');assert.ok(docs.has(file),'Missing existing lesson '+q.id+' '+href);if(hash)assert.ok(docs.get(file).getElementById(hash),'Missing lesson fragment '+q.id+' '+href);}
 }
 auditedOptions+=source.choices.length;
}
const groups=JSON.parse(fs.readFileSync(path.join(dir,'content/exam-groups.json'),'utf8'));
assert.equal(groups.length,33);assert.equal(groups.flatMap(g=>g.exams).length,200);assert.equal(new Set(groups.flatMap(g=>g.exams)).size,200);
assert.equal(docs.get('exam.html').querySelectorAll('.group-card').length,33);
assert.equal(docs.get('exam.html').querySelectorAll('.exam-criteria .issue-list').length,200);
assert.ok(docs.get('review.html').querySelectorAll('.supplement').length>0);
const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets/units.js'),'utf8').replace(/^window.CTA_UNITS\s*=\s*/,'').replace(/;\s*$/,''));
const reviewNotes=[...docs.get('review.html').querySelectorAll('.supplement')];
assert.equal(reviewNotes.length,77);
assert.equal(catalog.filter(u=>u.key.startsWith('admin.part')).length,32);
assert.equal(catalog.filter(u=>u.key.startsWith('admin.review.')).length,reviewNotes.length);
assert.equal(new Set(catalog.map(u=>u.key)).size,catalog.length,'Duplicate reading keys');
for(const note of reviewNotes){
 const buttons=note.querySelectorAll('[data-unit]');assert.equal(buttons.length,1,'One completion button per supplement');
 const key=buttons[0].dataset.unit;assert.equal(key,'admin.review.'+note.id);
 const item=catalog.find(u=>u.key===key);assert.ok(item,'Missing reading catalog entry');
 assert.equal(item.subject,'행정소송법');assert.equal(item.url,'admin-law/review.html#'+note.id);
 assert.ok(item.title.includes(note.querySelector('article').dataset.readingTitle),'Reading title lost');
}
// Exercise the real app importer; a syntactically valid YAML is insufficient.
const {registerHooks}=require('node:module');
const {pathToFileURL}=require('node:url');
const hooks=registerHooks({resolve(specifier,context,nextResolve){
  if(specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !path.extname(specifier)){
    try{return nextResolve(specifier+'.ts',context)}catch{}
  }
  return nextResolve(specifier,context);
}});
(async()=>{
 try {
  const {parseYamlCards}=await import(pathToFileURL(path.resolve(root,'../hoedok-desk/src/lib/importers.ts')).href);
  const parsed=parseYamlCards(fs.readFileSync(path.join(dir,'book.yaml'),'utf8'));
  assert.deepEqual(parsed.errors,[]);assert.equal(parsed.cards.length,64);assert.ok(parsed.cards.every(c=>c.subject==='행정소송법'));
  console.log(JSON.stringify({pages:files.length,units,quizzes:questions,examQuestions:200,examGroups:33,auditedOptions,disclosedSourceLimitations:audit.unresolved.length,internalLinks,appImport:parsed.cards.length,futureLawExcluded:true}));
 } finally {hooks.deregister();}
})().catch(error=>{console.error(error);process.exitCode=1;});
