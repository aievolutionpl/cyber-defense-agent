const { chromium } = await import(process.env.CDA_PLAYWRIGHT_MODULE || 'playwright');
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
await mkdir('output/site-review', { recursive: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  for (const locale of ['en', 'pl']) {
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`http://127.0.0.1:3107/${locale === 'pl' ? 'pl/' : ''}`);
      await page.waitForFunction(() => document.documentElement.dataset.motion === 'running');
      assert.equal(await page.locator('.motion-dock').count(), 0, 'floating dock removed');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale} ${width} no overflow`);
      const missing = await page.locator('a[href^="#"]').evaluateAll(links => links.map(a => a.getAttribute('href')).filter(href => href.length > 1 && !document.getElementById(href.slice(1))));
      assert.deepEqual(missing, [], 'all section links resolve');
      await page.locator('#scan').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1800);
      const first = await page.locator('.theater').getAttribute('data-stage');
      await page.waitForTimeout(1600);
      assert.notEqual(await page.locator('.theater').getAttribute('data-stage'), first, 'automatic stage cycle');
      await page.locator('.theater-playback button').click();
      const held = await page.locator('.theater').getAttribute('data-stage');
      await page.waitForTimeout(1600);
      assert.equal(await page.locator('.theater').getAttribute('data-stage'), held, 'local pause');
      await page.screenshot({ path: `output/site-review/${locale}-${width}.png` });
      await page.mouse.move(0, 0);
      await page.locator('.host-workflows').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.host-workflows').dataset.inView === 'true');
      await page.waitForTimeout(200);
      assert.equal(await page.locator('.host-track').evaluate(el => getComputedStyle(el).animationPlayState), 'running', 'host slides active');
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:3107/');
  await page.waitForFunction(() => document.documentElement.dataset.motion === 'running');
  await page.locator('#missions').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('#missions').dataset.buildStage === 'assembling');
  const cursorStart = await page.locator('.build-cursor').nth(1).evaluate(el => el.style.transform);
  await page.waitForTimeout(250);
  const cursorEnd = await page.locator('.build-cursor').nth(1).evaluate(el => el.style.transform);
  assert.notEqual(cursorStart, cursorEnd, 'cursor moves during section assembly');
  await page.screenshot({ path: 'output/site-review/desktop-construction.png' });
  await page.waitForFunction(() => !document.querySelector('#missions').dataset.buildStage);
  assert.equal(await page.locator('#missions > div').first().evaluate(el => el.style.opacity), '', 'assembly restores content');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#scan').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('html').getAttribute('data-motion'), 'paused');
  assert.equal(await page.locator('[data-build-pending]').count(), 0, 'reduced motion reveals all content');
  await page.locator('.theater-steps button').nth(1).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.theater').getAttribute('data-stage'), 'detect', 'keyboard stage selection');
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log('PASS: EN/PL, 320/390/768/1440, anchors, autoplay, pause, host slides, reduced motion, keyboard and console.');
} finally { await browser.close(); }
