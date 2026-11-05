// Run a static server, then: node scripts/mobile-layout-audit.cjs
// If Playwright is installed elsewhere, set PLAYWRIGHT_MODULE to its absolute package path.
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:8897/';
const widths = (process.env.AUDIT_WIDTHS || '320,360,390,768,1280').split(',').map(Number);
const secondLinks = path.join(root, 'second/links.json');
const linkedPages = new Set(fs.existsSync(secondLinks)
  ? JSON.parse(fs.readFileSync(secondLinks, 'utf8')).flatMap(row => row.lessons.map(lesson => lesson.url.split('#')[0]))
  : []);
const files = [];
for (const item of fs.readdirSync(root, { withFileTypes: true })) {
  if (item.isFile() && item.name.endsWith('.html')) files.push(item.name);
  if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'assets' && item.name !== 'scripts') {
    for (const child of fs.readdirSync(path.join(root, item.name))) if (child.endsWith('.html')) files.push(`${item.name}/${child}`);
  }
}
(async () => {
  const browser = await (process.env.AUDIT_BROWSER === 'webkit' ? webkit : chromium).launch({ headless: true });
  const failures = [], errors = [], states = {};
  let cases = 0;
  const page = await browser.newPage({ viewport: { width: 320, height: 844 }, colorScheme: process.env.AUDIT_THEME || 'light' });
  page.on('pageerror', error => errors.push({ file: page.url(), error: error.message }));
  async function check(file, state) {
    states[state] = (states[state] || 0) + 1;
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      const result = await page.evaluate(() => {
        const visible = element => element.getClientRects().length && getComputedStyle(element).display !== 'none';
        const offenders = [...document.body.querySelectorAll('*')].filter(visible).filter(element => {
          const style = getComputedStyle(element), rect = element.getBoundingClientRect();
          if (style.position === 'absolute' && (style.clipPath !== 'none' || rect.width <= 1)) return false;
          return rect.right > innerWidth + 1 || rect.left < -1 ||
            (element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 2 && ['auto', 'scroll'].includes(style.overflowX));
        }).map(element => ({ tag: element.tagName, class: element.className, id: element.id,
          width: element.clientWidth, scroll: element.scrollWidth, text: element.textContent.trim().slice(0, 75) }));
        return { document: document.documentElement.scrollWidth, viewport: innerWidth, offenders: offenders.slice(0, 15) };
      });
      cases++;
      if (result.document > width + 1 || result.offenders.length) failures.push({ file, state, width, ...result });
    }
  }
  for (const file of files) {
    await page.goto(base + file, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Backlinks are fetched after the initial document, so include their expanded content too.
    if (linkedPages.has(file)) await page.locator('.second-related').first().waitFor({ state: 'attached' });
    await page.evaluate(() => document.querySelectorAll('details').forEach(element => { element.open = true; }));
    await check(file, 'expanded');
    if (await page.locator('#mode-read').count()) {
      await page.locator('label[for="mode-read"]').click();
      await page.evaluate(() => document.querySelectorAll('details').forEach(element => { element.open = true; }));
      await check(file, 'reading-mode');
    }
    if (await page.locator('#quiz').isVisible()) {
      await page.locator('#quiz').check();
      await check(file, 'quiz-mode');
      await page.locator('#quiz').uncheck();
    }
    if (await page.locator('#exam-year').count()) {
      await page.locator('#exam-year').selectOption('2025');
      await page.locator('#exam-subject').selectOption('법인세');
      await page.locator('#exam-paper').selectOption('1');
      await check(file, 'second-exam-filtered');
      await page.locator('#exam-notes').check();
      await check(file, 'second-exam-notes');
      await page.locator('#exam-search').fill('없는 논점 테스트');
      await check(file, 'second-exam-empty');
      await page.locator('#exam-reset').click();
      await page.locator('#exam-notes').uncheck();
    }
    for (const selector of ['.ai-trigger[data-reading-ai]', '.ai-trigger:not([data-reading-ai])']) {
      const trigger = page.locator(selector + ':visible').first();
      if (!await trigger.count()) continue;
      await trigger.click();
      const include = page.locator('dialog[open] #ai-include');
      if (await include.isVisible()) await include.check();
      await check(file, selector.includes(':not') ? 'exam-ai-dialog' : 'reading-ai-dialog');
      await page.locator('dialog[open] #ai-close').click();
    }
    const preview = page.locator('[data-preview]:visible').first();
    if (await preview.count()) {
      await preview.click();
      await page.locator('#source-preview img').evaluate(image => image.decode().catch(() => {}));
      await check(file, 'source-preview');
      await page.locator('#source-preview button').click();
    }
  }
  await browser.close();
  console.log(JSON.stringify({ pages: files.length, cases, states, failures, errors }, null, 2));
  process.exitCode = failures.length || errors.length ? 1 : 0;
})();
