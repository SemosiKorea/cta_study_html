(() => {
 'use strict';
 const root=new URL('../',document.currentScript.src),path=decodeURIComponent(location.pathname),rootPath=decodeURIComponent(root.pathname),relative=path.startsWith(rootPath)?path.slice(rootPath.length):'';
 if(!relative||relative.startsWith('second/'))return;
 fetch(new URL('second/links.json',root)).then(r=>{if(!r.ok)throw Error('Unavailable');return r.json();}).then(rows=>{
  const relevant=rows.filter(row=>row.lessons.some(l=>l.url.split('#')[0]===relative));
  const groups=new Map();for(const row of relevant)for(const lesson of row.lessons){if(lesson.url.split('#')[0]!==relative)continue;const id=lesson.url.split('#')[1];const target=id?document.getElementById(id):document.querySelector('main');if(!target)continue;if(!groups.has(target))groups.set(target,new Map());groups.get(target).set(row.id,row);}
  for(const [target,group] of groups){const details=document.createElement('details');details.className='second-related';details.style.cssText='border-left:3px solid var(--link,#08624e);padding:8px 14px;margin:14px 0;background:var(--tile,#ebf2ec);border-radius:6px';const summary=document.createElement('summary');summary.textContent='2차 기출로 답안 작성 연습 · '+group.size+'문제';details.append(summary);const list=document.createElement('ul');for(const row of group.values()){const li=document.createElement('li'),a=document.createElement('a');a.href=new URL('second/index.html#'+row.id,root).href;a.textContent=`${row.year}년 세법학 ${row.paper}부 문제 ${row.number} · ${row.title}`;const p=document.createElement('p');p.textContent=row.practice[0]||'쟁점을 찾고 요건·사실관계·결론을 연결해 작성하세요.';li.append(a,p);list.append(li);}details.append(list);target.append(details);}
 }).catch(()=>{});
})();
