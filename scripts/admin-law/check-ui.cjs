#!/usr/bin/env node
// Local UI + isolated cross-origin reading bridge QA. Pass a deployed admin-law URL
// to check the served pages too; the bridge still uses local files and no account.
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '../..');
const siblingRequire = createRequire(path.join(root, '../hoedok-desk/package.json'));
const {chromium, webkit} = siblingRequire('playwright');
const YAML = siblingRequire('yaml');
const pages = ['index', ...Array.from({length:8}, (_,i)=>'part'+String(i+1).padStart(2,'0')), 'exam', 'cases', 'sources', 'review'];
const output = path.resolve(root, '../tmp/admin-law-ui');
const results = [], failures = [];
let server;
const mime = file => ({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf','.yaml':'application/yaml','.json':'application/json'}[path.extname(file)] || 'application/octet-stream');
async function diskResponse(url) {
  let relative = decodeURIComponent(url.pathname).replace(/^\/cta_study_html\//, '').replace(/^\//, '');
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  const file = path.resolve(root, relative);
  assert.ok(file.startsWith(root+path.sep), 'Path escapes repository');
  return {status:200, contentType:mime(file), body:await fs.readFile(file)};
}
async function localBase() {
  server = http.createServer(async(req,res)=>{
    try {const r=await diskResponse(new URL(req.url,'http://localhost'));res.writeHead(r.status,{'Content-Type':r.contentType});res.end(r.body);}
    catch {res.writeHead(404);res.end('Not found');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return `http://127.0.0.1:${server.address().port}/admin-law/`;
}
async function visibleCount(page, selector) {return page.locator(selector+':visible').count();}
async function measure(page, label, errors) {
  const state=await page.evaluate(()=>({
    width:innerWidth, pageWidth:document.documentElement.scrollWidth,
    overflow:[...document.querySelectorAll('main *, dialog[open] *')].filter(el=>{
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      return r.width>0&&r.height>0&&s.position!=='absolute'&&s.position!=='fixed'&&
        !el.closest('[hidden],details:not([open])>:not(summary)')&&
        (r.left < -2 || r.right > innerWidth+2);
    }).slice(0,8).map(el=>({tag:el.tagName,class:el.className,text:el.textContent.slice(0,60)})),
    shortSelects:[...document.querySelectorAll('select')].filter(el=>innerWidth<=680&&el.getClientRects().length&&el.getBoundingClientRect().height<44).map(el=>el.id)
  }));
  const result={label,...state,errors:[...errors]};results.push(result);
  assert.ok(state.pageWidth<=state.width+1, `${label}: page overflow ${JSON.stringify(state)}`);
  assert.deepEqual(state.overflow,[],`${label}: overflowing elements`);
  assert.deepEqual(state.shortSelects,[],`${label}: undersized select`);
  assert.deepEqual(errors,[],`${label}: browser errors`);
}
async function chapterChecks(page, label, errors) {
  assert.equal(await page.locator('section.unit').count(),4);
  assert.equal(await page.locator('.quiz-card').count(),8);
  assert.equal(await page.locator('[data-reading-ai]').count(),4);
  const core=page.locator('.core').first(), analogy=page.locator('.analogy > p').first();
  const coreText=(await core.innerText()).replace(/\s+/g,' ').trim();
  const analogyText=(await analogy.innerText()).replace(/\s+/g,' ').trim();
  await page.locator('[data-reading-ai]').first().click();
  const prompt=(await page.locator('#ai-prompt').inputValue()).replace(/\s+/g,' ');
  assert.ok(prompt.includes(coreText), label+': AI prompt lost core rule');
  assert.ok(prompt.includes(analogyText), label+': AI prompt lost analogy');
  assert.ok(prompt.includes('비유와 실제 법의 차이'), label+': AI prompt lost analogy limit');
  await measure(page,label+' / AI dialog',errors);
  await page.locator('#ai-close').click();
  const source=page.locator('article .source-block').first();
  await source.locator(':scope > summary').click();
  assert.ok((await source.locator('.law-original').first().innerText()).length>30);
  await measure(page,label+' / statute expanded',errors);
  await page.locator('#quiz').check();
  assert.equal(await visibleCount(page,'[data-reading]'),0,label+': reading visible in quiz mode');
  assert.equal(await page.locator('.quiz-card[open]').count(),8);
  assert.equal(await visibleCount(page,'.quiz-card .solution'),0,label+': answer leaked');
  await page.locator('.quiz-card').first().locator('details > summary').click();
  assert.equal(await visibleCount(page,'.quiz-card .solution'),1);
  await measure(page,label+' / OX answer',errors);
  await page.locator('#quiz').uncheck();
  assert.ok(await core.isVisible());
  assert.equal(await visibleCount(page,'.quiz-card .solution'),0);
  await page.getByRole('button',{name:'본문 글자 크게',exact:true}).click();
  assert.equal(await page.locator('#size-status').textContent(),'110%');
  await measure(page,label+' / larger text',errors);
  await page.reload();
  assert.equal(await page.locator('#size-status').textContent(),'110%',label+': font size not retained');
  await page.getByRole('button',{name:'본문 글자 작게',exact:true}).click();
  assert.equal(await page.locator('#size-status').textContent(),'100%');
}
async function examChecks(page,label,errors,base) {
  assert.equal(await page.locator('.exam-group-grid .group-card:visible').count(),33);
  assert.equal(await visibleCount(page,'.exam-entry'),0,'Overview should not dump 200 entries');
  await page.locator('.group-card').first().scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,label.replaceAll('/','-')+'-groups.png'),fullPage:false});
  const sourceLimits=page.locator('.source-limitations');
  await sourceLimits.locator(':scope > summary').click();
  assert.ok(await sourceLimits.locator('a[href="exam.html#q2024-60"]').isVisible());
  await measure(page,label+' / source limitation disclosed',errors);
  await sourceLimits.locator(':scope > summary').click();
  await page.locator('#exam-year').selectOption('2025');
  assert.ok((await page.locator('#exam-count').innerText()).startsWith('40문항'));
  await page.locator('[data-pick-group="stay"]').click();
  assert.equal(await visibleCount(page,'.exam-entry'),2);
  assert.equal(await page.locator('#exam-group').inputValue(),'stay');
  await page.locator('.exam-entry:visible').first().locator('.exam-reasoning > summary').click();
  assert.ok(await page.locator('.exam-entry:visible .issue-list').first().isVisible());
  await measure(page,label+' / grouped criteria',errors);
  await page.locator('.exam-entry:visible [data-compare]').nth(0).check();
  await page.locator('.exam-entry:visible [data-compare]').nth(1).check();
  await page.locator('#compare-open').click();
  assert.equal(await page.locator('#compare-dialog .exam-entry').count(),2);
  await page.locator('#compare-dialog .exam-reasoning > summary').first().click();
  await measure(page,label+' / compare two questions',errors);
  await page.screenshot({path:path.join(output,label.replaceAll('/','-')+'-comparison.png'),fullPage:false});
  await page.locator('#compare-close').click();
  await page.locator('#compare-clear').click();
  assert.equal(await page.locator('#compare-bar').isVisible(),false);
  await page.locator('#exam-reset').click();
  await page.locator('#exam-search').fill('2025년 80번');
  assert.equal(await visibleCount(page,'.exam-entry'),1);
  await page.locator('.exam-entry:visible [data-preview]').click();
  const preview=page.locator('#source-preview');await preview.waitFor({state:'visible'});
  await page.waitForFunction(()=>{const img=document.querySelector('#source-preview img');return img.complete&&img.naturalWidth>0;});
  assert.ok((await preview.locator('a').getAttribute('href')).includes('exam-2025.pdf#page='));
  await measure(page,label+' / exam preview',errors);
  await preview.getByRole('button',{name:'닫기',exact:true}).click();
  await page.locator('#exam-search').fill('존재하지않는검색어');
  assert.equal(await visibleCount(page,'.exam-entry'),0);assert.ok(await page.locator('#no-exams').isVisible());
  await page.goto(base+'exam.html?group=stay&year=2021&chapter=1&q=없는검색어#q2025-80');
  assert.ok(await page.locator('#q2025-80').isVisible(),label+': linked question hidden by filters');
  assert.equal(await page.locator('#exam-year').inputValue(),'');assert.equal(await page.locator('#exam-search').inputValue(),'');
  // In-page hash navigation must also reveal the new group.
  await page.evaluate(()=>location.hash='q2021-47');
  await page.locator('#q2021-47').waitFor({state:'visible'});
  assert.equal(await page.locator('#exam-group').inputValue(),'reference');
  await page.locator('#q2021-47 .exam-reasoning > summary').click();
  const backlink=page.locator('#q2021-47 a[href^="part"]').first();await backlink.click();await page.locator('section.unit').first().waitFor({state:'visible'});
  await page.goto(base+'exam.html?group=standing');
  assert.equal(await visibleCount(page,'.exam-entry'),9);
  const boxes=page.locator('.exam-group:visible [data-compare]');
  for(let i=0;i<3;i++)await boxes.nth(i).check();
  await boxes.nth(3).click();
  assert.equal(await page.locator('[data-compare]:checked').count(),3,'Comparison cap must be three');
  await page.locator('#compare-clear').click();
}
async function reviewChecks(page,label,errors,base){
  const supplement=page.locator('.supplement').first();assert.ok(await page.locator('.supplement').count()>0);
  const id=await supplement.getAttribute('id');await page.goto(base+'review.html#'+id);
  assert.equal(await page.locator('#'+id).getAttribute('open'),'');
  assert.ok(await page.locator('#'+id+' .analogy .limit').isVisible());
  assert.equal(await page.locator('#quiz').count(),0);
  await measure(page,label+' / supplemental note',errors);
  await page.screenshot({path:path.join(output,label.replaceAll('/','-')+'-supplement.png'),fullPage:false});
  await page.locator('#'+id+' [data-reading-ai]').click();
  assert.ok((await page.locator('#ai-prompt').inputValue()).includes('비유와 실제 법의 차이'));
  await measure(page,label+' / supplement AI',errors);await page.locator('#ai-close').click();
  const link=page.locator('#'+id+' a[href^="exam.html#"]').first();await link.click();
  await page.locator('.exam-entry:visible').first().waitFor({state:'visible'});
}
async function sourceChecks(page,label,errors,base) {
  assert.equal(await page.locator('section[id^="special-"]:not(#special-laws)').count(),7);
  await page.locator('#special-1 details summary').click();
  await measure(page,label+' / special law expanded',errors);
  await page.goto(base+'sources.html#act-12');
  assert.equal(await page.locator('#act-12').getAttribute('open'),'');
  const backlink=page.locator('#act-12 .law-backlinks a').first();
  assert.ok(await backlink.isVisible());
  await measure(page,label+' / source hash',errors);
  const href=await backlink.getAttribute('href');
  await backlink.click();
  const hash=new URL(href,base).hash;
  await page.locator(hash).waitFor({state:'visible'});
}
async function pageSuite(base) {
  for (const [engineName,engine,widths] of [['chromium',chromium,[360,1280]],['webkit',webkit,[360]]]) {
    const browser=await engine.launch();
    try {for(const width of widths)for(const dark of [false,true]) {
      const context=await browser.newContext({viewport:{width,height:900},colorScheme:dark?'dark':'light',serviceWorkers:'block',acceptDownloads:true});
      // UI checks must not send reading records to the user's account.
      await context.route('https://semosikorea-cta-v2.web.app/book-reading-v1.js*',route=>route.fulfill({contentType:'application/javascript',body:'/* Account writes disabled in UI QA. Covered separately by isolated bridge test. */'}));
      const page=await context.newPage(),errors=[];
      page.setDefaultTimeout(8000);
      console.log(`Checking ${engineName} ${width}px ${dark?'dark':'light'} (13 pages)`);
      page.on('pageerror',e=>errors.push(e.message));
      for(const name of pages) {
        const label=`${engineName}/${width}/${dark?'dark':'light'}/${name}`;
        try {
          errors.length=0;
          const response=await page.goto(base+name+'.html');
          assert.equal(response.status(),200,label+': HTTP failure');
          await page.locator('h1').waitFor();
          await page.locator('select[data-appearance]').waitFor();
          await measure(page,label,errors);
          if(name.startsWith('part'))await chapterChecks(page,label,errors);
          if(name==='exam')await examChecks(page,label,errors,base);
          if(name==='sources')await sourceChecks(page,label,errors,base);
          if(name==='review')await reviewChecks(page,label,errors,base);
          if(name==='index') {
            assert.equal(await page.locator('.chapter-card').count(),8);
            const download=page.waitForEvent('download');
            await page.locator('a[download][href="book.yaml"]').click();
            const file=await download;
            const parsed=YAML.parse(await fs.readFile(await file.path(),'utf8'));
            assert.equal(parsed.schema,'hoedok.cards/v1');assert.equal(parsed.cards.length,64);
            assert.ok(parsed.cards.every(c=>c.subject==='행정소송법'&&['O','X'].includes(c.answer)&&c.rationale));
          }
          if((name==='index'||name==='part01'||name==='exam')&&width===360) {
            await page.goto(base+name+'.html');
            await page.screenshot({path:path.join(output,`${engineName}-${dark?'dark':'light'}-${name}.png`),fullPage:name!=='exam'});
            if(name==='part01'){await page.locator('#u01').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`${engineName}-${dark?'dark':'light'}-part01-unit.png`),fullPage:false});}
          }
        } catch(error) {
          failures.push({label,error:error.message});
          await page.screenshot({path:path.join(output,`${engineName}-${width}-${dark?'dark':'light'}-${name}-failure.png`),fullPage:false}).catch(()=>{});
        }
      }
      await context.close();
    }}finally{await browser.close();}
  }
}
async function bridgeSuite() {
  const browser=await chromium.launch();
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const pagesOrigin='https://semosikorea.github.io',deskOrigin='https://semosikorea-cta-v2.web.app';
  const bridge=await fs.readFile(path.resolve(root,'../hoedok-desk/public/book-reading-v1.js'),'utf8');
  await context.route('https://**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin===pagesOrigin){try{return route.fulfill(await diskResponse(url));}catch{return route.fulfill({status:404,body:'missing'});}}
    if(url.origin===deskOrigin&&url.pathname==='/book-reading-v1.js')return route.fulfill({contentType:'application/javascript',body:bridge});
    if(url.origin===deskOrigin&&url.pathname==='/desk/reader/')return route.fulfill({contentType:'text/html',body:`<!doctype html><html><body><iframe style="width:100%;height:800px;border:0" src="${pagesOrigin}/cta_study_html/admin-law/part01.html"></iframe><script>window.messages=[];addEventListener('message',e=>{if(e.origin==='${pagesOrigin}'&&e.data?.type==='reading:add')messages.push(e.data)});window.ack=ids=>document.querySelector('iframe').contentWindow.postMessage({type:'reading:saved',ids},'${pagesOrigin}');</script></body></html>`});
    return route.abort();
  });
  await context.addInitScript(()=>{
    if(location.origin==='https://semosikorea.github.io'&&!localStorage.getItem('qa:bridge-seeded')){
      localStorage.setItem('cta_study_html.read.v1.admin.part01.u01','2026-11-10');localStorage.setItem('qa:bridge-seeded','1');
    }
  });
  try {
    const page=await context.newPage();page.setDefaultTimeout(8000);await page.goto(deskOrigin+'/desk/reader/?qa=1');
    await page.waitForFunction(()=>messages.length>0);
    const frame=page.frames().find(frame=>frame.url().startsWith(pagesOrigin));
    assert.ok(frame);
    assert.equal(await frame.locator('[data-cloud-read="1"]').count(),4);
    const migrated=await page.evaluate(()=>messages[0].entries);
    assert.equal(migrated.length,1);assert.equal(migrated[0].id,'old-admin.part01.u01-2026-11-10');
    await page.evaluate(ids=>ack(ids),migrated.map(e=>e.id));
    await frame.waitForFunction(()=>!Object.keys(localStorage).some(k=>k.startsWith('cta.read.pending.tax.')));
    await frame.locator('[data-unit="admin.part01.u01"]').click();
    await page.waitForFunction(()=>messages.length>=2);
    const sent=await page.evaluate(()=>messages.at(-1).entries);
    assert.equal(sent.length,1);assert.equal(sent[0].book,'tax');assert.equal(sent[0].unit,'admin.part01.u01');
    assert.ok(!sent[0].id.startsWith('old-'));
    await frame.evaluate(()=>dispatchEvent(new Event('online')));
    await page.waitForFunction(()=>messages.length>=3);
    assert.equal(await page.evaluate(()=>messages.at(-1).entries[0].id),sent[0].id,'Retry must retain event ID');
    await page.evaluate(ids=>ack(ids),[sent[0].id]);
    await frame.waitForFunction(()=>!Object.keys(localStorage).some(k=>k.startsWith('cta.read.pending.tax.')));
    assert.ok((await frame.locator('body').innerText()).includes('공부책상에 저장됨'));
    const count=await page.evaluate(()=>messages.length);
    await frame.goto(pagesOrigin+'/cta_study_html/admin-law/part01.html');
    await frame.locator('[data-cloud-read="1"]').first().waitFor();
    await frame.evaluate(()=>dispatchEvent(new Event('online')));
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>messages.length),count,'Acknowledged legacy migration must not repeat');
    results.push({label:'isolated reading bridge',legacyMigration:1,newEvent:1,retryRetainsId:true,ackClearsPending:true,noDuplicateMigration:true});
  }finally{await context.close();await browser.close();}
}
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const supplied=process.argv[2];const base=supplied?(supplied.endsWith('/')?supplied:supplied+'/'):await localBase();
  try {
    await pageSuite(base);
    try{await bridgeSuite();}catch(error){failures.push({label:'isolated reading bridge',error:error.message});}
    await fs.writeFile(path.join(output,'results.json'),JSON.stringify({base,checks:results.length,failures,results},null,2));
    console.log(JSON.stringify({base,checks:results.length,failures,output},null,2));
    if(failures.length)process.exitCode=1;
  }finally{if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;if(server)server.close();});
