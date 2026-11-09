(() => {
 'use strict';
 const prefix='cta_study_html.read.v1.', sizeKey='admin-law.reading-size.v1';
 function applySize(value){const n=Math.min(1.35,Math.max(.95,Number(value)||1));document.body.style.setProperty('--reading-scale',n);const out=document.querySelector('#size-status');if(out)out.textContent=Math.round(n*100)+'%';return n;}
 let scale=1;try{scale=applySize(localStorage.getItem(sizeKey)||1)}catch{applySize(1)}
 for(const b of document.querySelectorAll('[data-font]'))b.addEventListener('click',()=>{scale=applySize(scale+Number(b.dataset.font));try{localStorage.setItem(sizeKey,scale)}catch{}});
 function progress(){const out=document.querySelector('#admin-progress');if(!out)return;const units=(window.CTA_UNITS||[]).filter(u=>u.key.startsWith('admin.'));try{const done=units.filter(u=>/^\d{4}-\d{2}-\d{2}$/.test(localStorage.getItem(prefix+u.key)||'')).length;out.textContent=done+' / '+units.length+'개 단원 읽음';document.querySelector('#progress-fill').style.width=(100*done/units.length)+'%';}catch{out.textContent='이 브라우저에서는 읽기 표시를 불러올 수 없습니다.'}}
 progress();window.addEventListener('storage',progress);window.addEventListener('pageshow',progress);
 const rows=[...document.querySelectorAll('.exam-entry')],year=document.querySelector('#exam-year'),chapter=document.querySelector('#exam-chapter'),search=document.querySelector('#exam-search');
 function filter(){if(!rows.length)return;const term=(search.value||'').trim().toLowerCase();let count=0;for(const row of rows){const show=(!year.value||row.dataset.year===year.value)&&(!chapter.value||row.dataset.chapter===chapter.value)&&(!term||row.textContent.toLowerCase().includes(term));row.hidden=!show;if(show)count++;}document.querySelector('#exam-count').textContent=count+'문항';document.querySelector('#no-exams').hidden=count>0;const u=new URL(location.href);for(const [key,value] of [['year',year.value],['chapter',chapter.value],['q',search.value]])value?u.searchParams.set(key,value):u.searchParams.delete(key);if(location.protocol!=='file:')history.replaceState(null,'',u);}
 if(rows.length){const params=new URL(location.href).searchParams;year.value=params.get('year')||'';chapter.value=params.get('chapter')||'';search.value=params.get('q')||'';const target=document.querySelector(location.hash&&/^#q\d{4}-\d{2}$/.test(location.hash)?location.hash:'#none');if(target){year.value='';chapter.value='';search.value='';}for(const el of [year,chapter,search])el.addEventListener('input',filter);filter();}
 function revealHash(){if(!location.hash)return;let el;try{el=document.getElementById(decodeURIComponent(location.hash.slice(1)))}catch{}if(el){for(let p=el;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;}}
 revealHash();window.addEventListener('hashchange',revealHash);
})();
