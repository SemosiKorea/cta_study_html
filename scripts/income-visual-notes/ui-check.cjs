const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), {chromium} = require('playwright');
const root = path.resolve(__dirname, '../..');
const units = ['part01','part02-03','part04-06','part07-10'].flatMap(f => JSON.parse(fs.readFileSync(path.join(__dirname, f+'.json'))).units);

(async () => {
  let server, base = process.argv[2];
  if (!base) {
    server = http.createServer((req,res) => {
      try {
        const uri = decodeURIComponent(new URL(req.url,'http://local').pathname);
        const file = path.join(root, uri.endsWith('/') ? uri+'index.html' : uri);
        res.setHeader('Content-Type', ({'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'text/javascript;charset=utf-8','.webp':'image/webp','.pdf':'application/pdf'})[path.extname(file)] || 'application/octet-stream');
        res.end(fs.readFileSync(file));
      } catch { res.statusCode=404; res.end('Not found'); }
    });
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    base='http://127.0.0.1:'+server.address().port+'/';
  }
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    for (const width of [360,1280]) {
      const context=await browser.newContext({viewport:{width,height:950},colorScheme:width===360?'dark':'light'});
      const page=await context.newPage(), errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      for(let n=1;n<=10;n++) {
        const file=`part${String(n).padStart(2,'0')}.html`, items=units.filter(u=>u.file===file);
        await page.goto(base+'income/'+file);
        await page.locator('[data-reading-ai]').first().waitFor();
        assert.equal(await page.locator('[data-income-visual]').count(),items.length);
        assert.equal(await page.locator('.visual-guide').count(),1);
        for(const u of items) {
          const article=page.locator('article#'+u.id), core=article.locator(':scope>[data-income-visual]');
          assert(await core.isVisible(),file+'#'+u.id);
          assert.equal(await article.locator(':scope>.rule-more').getAttribute('open'),null);
          assert.equal(await article.locator('[data-original-explanation]').isVisible(),false);
          assert(await core.evaluate(e=>e.scrollWidth<=e.clientWidth+1),file+' '+u.id+' core overflow');
        }
        const selected=[items[0],...['matrix','steps','decision','timeline'].map(t=>items.find(u=>u.diagram.type===t)).filter(Boolean)];
        for(const u of [...new Map(selected.map(u=>[u.id,u])).values()]) {
          const article=page.locator('#'+u.id), more=article.locator(':scope>.rule-more');
          await article.locator('[data-reading-ai]').click();
          const before=await page.locator('#ai-prompt').inputValue();
          assert(before.includes(u.analogy));assert(before.includes(u.diagram.caption));
          assert(!before.includes('예상 O·X와'));
          await page.locator('#ai-close').click();
          await more.locator(':scope>summary').click();
          assert(await more.locator('[data-original-explanation]').isVisible());
          await article.locator('[data-reading-ai]').click();
          const after=await page.locator('#ai-prompt').inputValue();
          assert(after.length>before.length);await page.locator('#ai-close').click();
          await more.locator(':scope>summary').click();
          if([1,6,9].includes(n))await article.screenshot({path:path.join(require('node:os').tmpdir(),`income-visual-${n}-${u.id}-${width}.png`)});
        }
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),file+' document overflow');
        await page.locator('#quiz').check();
        assert.equal(await page.locator('article:visible').count(),0);
        assert.equal(await page.locator('.sentence-answer[open]').count(),0);
        assert.equal(await page.locator('.sentence-practice[open]').count(),items.length);
        await page.locator('#quiz').uncheck();
        const practice=page.locator('.sentence-practice').first();
        await practice.locator(':scope>summary').click();
        await practice.locator('.sentence-answer').first().locator('summary').click();
        assert(await practice.locator('.sentence-answer').first().locator('.solution').isVisible());
        console.log(width,file,items.length,'core / details / AI / quiz / overflow passed');
      }
      await page.goto(base+'income/part01.html');
      await page.locator('#ch1-s1 > small a[data-preview]').click();
      await page.waitForFunction(()=>{const i=document.querySelector('#source-preview img');return i?.complete&&i.naturalWidth>0});
      await page.locator('#source-preview button').click();
      await page.evaluate(()=>localStorage.setItem('cta_study_html.read.v1.income.p01.c01','2026-11-01'));
      await page.goto(base+'index.html');
      assert(await page.locator('#read-history').innerText().then(t=>t.includes('소득세')));
      await page.goto(base+'income/index.html');
      await page.locator('#visual-notes-info a').first().click();
      await page.waitForURL(/part01.html#ch2-s2/);
      assert(await page.locator('#ch2-s2').isVisible());
      assert.deepEqual(errors,[]);await context.close();
    }
  } finally {
    await browser.close();if(server)await new Promise(r=>server.close(r));
  }
})().catch(e=>{console.error(e);process.exitCode=1});
