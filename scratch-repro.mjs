import { chromium, devices } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

for (const [label, ctxOpts] of [
  ['desktop', { viewport: { width: 1280, height: 720 } }],
  ['mobile-touch', { ...devices['Pixel 7'] }],
]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log(`[${label}][error]`, m.text().slice(0, 200)); });
  await page.goto('http://localhost:4981/');
  await page.waitForTimeout(3000);
  const frame = page.frames().find(f => f !== page.mainFrame());
  const tap = async (sel) => {
    const el = frame.locator(sel);
    if (ctxOpts.hasTouch) await el.tap(); else await el.click();
  };
  await tap('.main-menu .btn-primary');
  await page.waitForTimeout(400);
  await tap('[data-start="1"]');
  await page.waitForTimeout(600);
  const afterStart = await frame.evaluate(() => ({
    mapHidden: document.querySelector('.level-select')?.classList.contains('hidden'),
    mapDisplay: getComputedStyle(document.querySelector('.level-select')).display,
    introVisible: !document.querySelectorAll('.overlay')[6]?.classList.contains('hidden'),
  }));
  console.log(`[${label}] after level start:`, JSON.stringify(afterStart));
  await tap('[data-a="go"]').catch(e => console.log(`[${label}] go tap fail:`, e.message.slice(0, 80)));
  await page.waitForTimeout(1500);
  const afterGo = await frame.evaluate(() => ({
    mapHidden: document.querySelector('.level-select')?.classList.contains('hidden'),
    state: window.__icecreamDebug?.debugSession?.state,
    visibleOverlays: [...document.querySelectorAll('.overlay')].filter(o => !o.classList.contains('hidden')).map(o => o.className),
  }));
  console.log(`[${label}] after go:`, JSON.stringify(afterGo));
  await ctx.close();
}
await browser.close();
