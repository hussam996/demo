import { chromium, devices } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const S = '/tmp/claude-0/-home-user-demo/da079a53-a0f3-55ba-9d84-2716da8fef42/scratchpad';
for (const [label, opts] of [
  ['desktop', { viewport: { width: 1280, height: 720 } }],
  ['mobile', { ...devices['Pixel 7'] }],
]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log(`[${label}][err]`, m.text().slice(0, 160)); });
  page.on('pageerror', e => console.log(`[${label}][pageerror]`, String(e).slice(0, 300)));
  await page.goto('http://localhost:4982/');
  await page.waitForTimeout(3500);
  const tap = async (sel) => opts.hasTouch ? page.locator(sel).tap() : page.locator(sel).click();
  try {
    await tap('.main-menu .btn-primary');
    await page.waitForTimeout(500);
    console.log(`[${label}] level cards:`, await page.locator('.level-card').count());
    await tap('[data-start="1"]');
    await page.waitForTimeout(700);
    const st1 = await page.evaluate(() => ({
      mapHidden: document.querySelector('.level-select')?.classList.contains('hidden'),
      mapDisplay: getComputedStyle(document.querySelector('.level-select')).display,
    }));
    console.log(`[${label}] after start:`, JSON.stringify(st1));
    await tap('[data-a="go"]');
    await page.waitForTimeout(2500);
    const st2 = await page.evaluate(() => ({
      state: window.__icecreamDebug?.debugSession?.state,
      mapDisplay: getComputedStyle(document.querySelector('.level-select')).display,
      docHeight: document.documentElement.scrollHeight,
      appHeight: document.getElementById('app')?.getBoundingClientRect().height,
    }));
    console.log(`[${label}] in game:`, JSON.stringify(st2));
  } catch (e) {
    console.log(`[${label}] FLOW FAILED:`, e.message.split('\n')[0]);
    await page.screenshot({ path: `${S}/real-${label}-fail.png` });
  }
  await page.screenshot({ path: `${S}/real-${label}.png` });
  await ctx.close();
}
await browser.close();
