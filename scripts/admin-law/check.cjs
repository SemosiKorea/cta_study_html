const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'admin-law');
const deps=process.env.HOEDOK_NODE_MODULES||path.resolve(root,'../hoedok-desk/node_modules');
const {JSDOM}=require(path.join(deps,'jsdom'));
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.html')),docs=new Map();
assert.equal(files.length,12);
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
  console.log(JSON.stringify({pages:files.length,units,quizzes:questions,examQuestions:200,internalLinks,appImport:parsed.cards.length,futureLawExcluded:true}));
 } finally {hooks.deregister();}
})().catch(error=>{console.error(error);process.exitCode=1;});
