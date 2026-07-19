import { chromium, devices } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ ...devices['Pixel 7'] });
const page = await ctx.newPage();
const S = '/tmp/claude-0/-home-user-demo/da079a53-a0f3-55ba-9d84-2716da8fef42/scratchpad';
page.on('console', m => { if (m.type() === 'error') console.log('[error]', m.text().slice(0, 200)); });
await page.goto('http://localhost:4981/');
await page.waitForTimeout(3500);
const frame = page.frames().find(f => f !== page.mainFrame());
await page.screenshot({ path: S + '/touch-0-menu.png' });
const btn = frame.locator('.main-menu .btn-primary');
console.log('play btn visible:', await btn.isVisible(), 'box:', JSON.stringify(await btn.boundingBox()));
// try tap with short timeout, capture why it fails
try {
  await btn.tap({ timeout: 8000 });
  console.log('tap ok');
} catch (e) {
  console.log('tap FAILED:', e.message.split('\n').slice(0, 6).join(' | '));
}
await page.waitForTimeout(600);
console.log('level cards after tap:', await frame.locator('.level-card').count());
// fall back: dispatch click programmatically to compare
if ((await frame.locator('.level-card').count()) === 0) {
  await frame.evaluate(() => document.querySelector('.main-menu .btn-primary').click());
  await page.waitForTimeout(500);
  console.log('level cards after js click:', await frame.locator('.level-card').count());
}
await page.screenshot({ path: S + '/touch-1-map.png' });
await browser.close();
