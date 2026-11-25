async (page) => {
  const checks = [], errors = [];
  const assert = (condition, name) => { if (!condition) throw new Error(name); checks.push(name); };
  const base = new URL('/workspace', page.url()).href;
  page.on('pageerror', error => errors.push(error.message));
  for (const locale of ['pl', 'en']) {
    await page.goto(base + '?lang=' + locale);
    await page.locator('#overview-metrics .overview-metric').first().waitFor();
    assert(await page.locator('html').getAttribute('lang') === locale, `${locale} language`);
    for (const view of ['overview', 'projects', 'reports', 'terminal', 'agents']) {
      await page.locator(`.nav-item[data-view="${view}"]`).click();
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale} ${view} reflow ${width}`);
      }
    }
    await page.locator('.nav-item[data-view="projects"]').click();
    await page.locator('#view-projects [data-view="start"]').click();
    await page.locator('#wf-project').focus();
    await page.locator('#wf-project').press('Enter');
    assert(await page.locator('#wf-files').isVisible(), `${locale} keyboard project selection`);
    await page.locator('#start-workflow-btn').click();
    assert(await page.locator('#form-error').isVisible(), `${locale} missing consent feedback`);
    await page.locator('#wf-demo').click();
    assert(!(await page.locator('#consent-check').isVisible()), `${locale} demo needs no target consent`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.nav-item[data-view="terminal"]').click();
    assert(await page.locator('#chat-message').isVisible(), `${locale} reduced motion terminal`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
  assert(errors.length === 0, 'no uncaught browser errors');
  return { passed: checks.length, errors };
}
