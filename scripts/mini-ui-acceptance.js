async (page) => {
  const checks = [], errors = [];
  const assert = (condition, name) => { if (!condition) throw new Error(name); checks.push(name); };
  const base = new URL('/', page.url()).href;
  page.on('pageerror', error => errors.push(error.message));
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin });
  for (const locale of ['pl', 'en']) {
    const pl = locale === 'pl';
    await page.goto(base + '?lang=' + locale);
    await page.locator('.agent-pill').first().waitFor();
    await page.waitForFunction(() => document.querySelector('#bridge-command').textContent.length > 0);
    assert(await page.locator('html').getAttribute('lang') === locale, `${locale} document language`);
    const project = page.locator('#wf-project');
    await project.focus(); await project.press('Enter');
    assert(await page.locator('#wf-files').isVisible(), `${locale} explicit project file input`);
    assert(await project.getAttribute('aria-pressed') === 'true', `${locale} workflow keyboard selection`);
    await page.locator('#wf-demo').click();
    assert(!(await page.locator('#consent-check').isVisible()), `${locale} synthetic demo consent state`);
    await page.waitForFunction(() => document.querySelector('#bridge-command').textContent.includes('tools/demo.mjs'));
    await page.getByRole('button', { name: pl ? '📋 Kopiuj komendę CLI' : '📋 Copy CLI command', exact: true }).click();
    assert((await page.evaluate(() => navigator.clipboard.readText())).includes('tools/demo.mjs'), `${locale} command clipboard`);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale} reflow ${width}`);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert(await page.locator('#start-workflow-btn').isVisible(), `${locale} reduced motion action`);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `output/playwright/${locale}-mini-ui-mobile.png`, fullPage: true });
  }
  const startedResponse = page.waitForResponse(response => response.url().endsWith('/api/workflows/start') && response.request().method() === 'POST');
  await page.locator('#start-workflow-btn').click();
  const started = await (await startedResponse).json();
  assert(started.ok, 'synthetic workflow accepted');
  await page.waitForFunction(runId => {
    const text = document.querySelector('#active-run-box')?.textContent || '';
    return text.includes(runId) && text.includes('completed');
  }, started.run.runId, { timeout: 20000 });
  assert(await page.locator('#active-run-box .report-chip').count() >= 2, 'real synthetic CLI demo reports');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'output/playwright/mini-ui-completed.png', fullPage: true });
  for (const locale of ['pl', 'en']) {
    const run = { runId: 'run-approval-fixture', status: 'awaiting_approval', title: 'Synthetic approval', steps: [], reports: [], pendingApproval: { kind: 'scope', token: 'synthetic-approval-token', root: '/synthetic/project', files: ['package.json', 'src/example.ts'] } };
    let approved = false;
    await page.route('**/api/status', route => route.fulfill({ json: { agents: {}, sessions: [], reports: [], runs: [run] } }));
    await page.route('**/api/workflows/approve', route => {
      approved = route.request().postDataJSON().approvalToken === 'synthetic-approval-token';
      run.status = 'completed'; run.pendingApproval = null;
      return route.fulfill({ json: { ok: true, run } });
    });
    await page.goto(base + '?lang=' + locale);
    await page.locator('#approve-workflow-btn').waitFor();
    assert((await page.locator('#active-run-box pre').innerText()).includes('src/example.ts'), `${locale} exact scope displayed`);
    const approve = page.locator('#approve-workflow-btn');
    await approve.focus(); await approve.press('Enter');
    await page.waitForFunction(() => document.querySelector('#active-run-box')?.textContent.includes('completed'));
    assert(approved, `${locale} scoped approval token submitted`);
    await page.unroute('**/api/status'); await page.unroute('**/api/workflows/approve');
  }
  const malicious = '<img src=x onerror="document.body.dataset.injected=true">';
  await page.route('**/api/status', async route => route.fulfill({ json: {
    agents: {}, sessions: [], reports: [], runs: [{ runId: 'run-xss-fixture', status: 'completed', title: malicious, nextStep: malicious, steps: [{ label: malicious, status: 'completed' }], reports: [] }]
  } }));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#runs-history')?.textContent.includes('<img'));
  assert(await page.locator('#runs-history img, #active-run-box img').count() === 0, 'untrusted findings rendered as text');
  assert(!(await page.locator('body').getAttribute('data-injected')), 'untrusted finding script stays inert');
  await page.unroute('**/api/status');
  await page.reload();
  assert(errors.length === 0, 'uncaught browser errors');
  return { passed: checks.length, errors };
}
