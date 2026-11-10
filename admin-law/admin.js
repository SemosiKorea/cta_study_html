(() => {
 'use strict';
 const prefix='cta_study_html.read.v1.', sizeKey='admin-law.reading-size.v1';
 function applySize(value){const n=Math.min(1.35,Math.max(.95,Number(value)||1));document.body.style.setProperty('--reading-scale',n);const out=document.querySelector('#size-status');if(out)out.textContent=Math.round(n*100)+'%';return n;}
 let scale=1;try{scale=applySize(localStorage.getItem(sizeKey)||1)}catch{applySize(1)}
 for(const b of document.querySelectorAll('[data-font]'))b.addEventListener('click',()=>{scale=applySize(scale+Number(b.dataset.font));try{localStorage.setItem(sizeKey,scale)}catch{}});
 function progress(){const out=document.querySelector('#admin-progress');if(!out)return;const units=(window.CTA_UNITS||[]).filter(u=>u.key.startsWith('admin.part'));try{const done=units.filter(u=>/^\d{4}-\d{2}-\d{2}$/.test(localStorage.getItem(prefix+u.key)||'')).length;out.textContent=done+' / '+units.length+'개 단원 읽음';document.querySelector('#progress-fill').style.width=(100*done/units.length)+'%';}catch{out.textContent='이 브라우저에서는 읽기 표시를 불러올 수 없습니다.'}}
 progress();window.addEventListener('storage',progress);window.addEventListener('pageshow',progress);
 const rows=[...document.querySelectorAll('.exam-entry')],groupPanels=[...document.querySelectorAll('.exam-group')],year=document.querySelector('#exam-year'),chapter=document.querySelector('#exam-chapter'),search=document.querySelector('#exam-search'),group=document.querySelector('#exam-group');
 const norm=s=>String(s).toLowerCase().replace(/\s+/g,'');
 function filter(updateURL=true){
  if(!rows.length)return;
  const term=norm(search.value),queryActive=!!term,chosen=group.value;
  let count=0,groupCount=0;
  for(const panel of groupPanels){
   let n=0;
   for(const row of panel.querySelectorAll('.exam-entry')){
    const show=(!year.value||row.dataset.year===year.value)&&(!chapter.value||row.dataset.chapter===chapter.value)&&(!term||norm(row.textContent+" "+row.id.slice(1)).includes(term));
    row.hidden=!show;if(show)n++;
   }
   const selected=!chosen||panel.dataset.group===chosen;
   panel.hidden=!(selected&&n&&(chosen||queryActive));
   const card=document.querySelector('[data-pick-group="'+panel.dataset.group+'"]');
   card.hidden=!n;card.querySelector('[data-group-count]').textContent=n;
   if(selected&&n){count+=n;groupCount++;}
  }
  document.querySelector('#group-overview').hidden=!!chosen||queryActive;
  document.querySelector('#exam-count').textContent=count+'문항 · '+groupCount+'개 묶음'+(!chosen&&!queryActive?' — 묶음을 골라 문제를 펼치세요':'');
  document.querySelector('#no-exams').hidden=count>0;
  if(updateURL&&location.protocol!=='file:'){
   const u=new URL(location.href);for(const [key,value] of [['group',group.value],['year',year.value],['chapter',chapter.value],['q',search.value]])value?u.searchParams.set(key,value):u.searchParams.delete(key);
   u.hash='';history.replaceState(null,'',u);
  }
 }
 function pickGroup(id){group.value=id;filter();const target=document.querySelector('#group-'+id);target?.scrollIntoView({block:'start',behavior:'smooth'});}
 function showLinkedQuestion(){
  if(!rows.length||!/^#q\d{4}-\d{2}$/.test(location.hash))return;
  const row=document.getElementById(location.hash.slice(1));if(!row)return;
  year.value='';chapter.value='';search.value='';group.value=row.closest('.exam-group').dataset.group;filter(false);
  requestAnimationFrame(()=>row.scrollIntoView({block:'start'}));
 }
 if(rows.length){
  const params=new URL(location.href).searchParams;for(const [el,key] of [[year,'year'],[chapter,'chapter'],[search,'q'],[group,'group']])el.value=params.get(key)||'';
  filter(false);showLinkedQuestion();
  for(const el of [year,chapter,search,group])el.addEventListener('input',()=>filter());
  for(const b of document.querySelectorAll('[data-pick-group]'))b.addEventListener('click',()=>pickGroup(b.dataset.pickGroup));
  for(const b of document.querySelectorAll('[data-back-groups]'))b.addEventListener('click',()=>{group.value='';search.value='';filter();document.querySelector('#group-overview').scrollIntoView({block:'start'});});
  document.querySelector('#exam-reset').addEventListener('click',()=>{year.value='';chapter.value='';search.value='';group.value='';filter();});
  window.addEventListener('hashchange',showLinkedQuestion);
  const selected=new Set(),bar=document.querySelector('#compare-bar'),dialog=document.querySelector('#compare-dialog'),status=document.querySelector('#compare-count');
  function updateCompare(){bar.hidden=!selected.size;status.textContent=selected.size+' / 3문항 담음';document.querySelector('#compare-open').disabled=selected.size<2;}
  for(const box of document.querySelectorAll('[data-compare]'))box.addEventListener('change',()=>{
   if(box.checked&&selected.size>=3){box.checked=false;status.textContent='최대 3문항까지 비교할 수 있어요.';return;}
   box.checked?selected.add(box.dataset.compare):selected.delete(box.dataset.compare);updateCompare();
  });
  document.querySelector('#compare-clear').addEventListener('click',()=>{selected.clear();document.querySelectorAll('[data-compare]').forEach(b=>b.checked=false);updateCompare();});
  document.querySelector('#compare-open').addEventListener('click',()=>{
   const content=document.querySelector('#compare-content');content.replaceChildren();
   for(const id of selected){const original=document.getElementById('q'+id),copy=original.cloneNode(true);copy.removeAttribute('id');copy.removeAttribute('hidden');copy.querySelector('.compare-pick')?.remove();copy.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));copy.querySelectorAll('[data-preview]').forEach(el=>el.removeAttribute('data-preview'));copy.querySelector('.exam-reasoning').open=false;content.append(copy);}
   dialog.showModal();
  });
  document.querySelector('#compare-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 }
 function revealHash(){if(!location.hash)return;let el;try{el=document.getElementById(decodeURIComponent(location.hash.slice(1)))}catch{}if(el){for(let p=el;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;}}
 revealHash();window.addEventListener('hashchange',revealHash);
})();
