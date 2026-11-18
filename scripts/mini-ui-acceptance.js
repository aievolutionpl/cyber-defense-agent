async (page) => {
  const checks = [], errors = [];
  const assert = (condition, name) => { if (!condition) throw new Error(name); checks.push(name); };
  const base = new URL('/', page.url()).href;
  page.on('pageerror', error => errors.push(error.message));
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin });

  for (const locale of ['pl', 'en']) {
    await page.goto(base + '?lang=' + locale + '#audit');
    await page.locator('#wf-start').waitFor();
    assert(await page.locator('html').getAttribute('lang') === locale, `${locale} document language`);
    const project = page.locator('[data-wf="project"]');
    await project.press('Enter');
    assert(await page.locator('#wf-files').isVisible(), `${locale} explicit project file input`);
    assert(await project.getAttribute('aria-checked') === 'true', `${locale} workflow keyboard selection`);
    await page.locator('[data-wf="demo"]').click();
    assert(!(await page.locator('#wf-consent').isVisible()), `${locale} synthetic demo consent state`);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale} reflow ${width}`);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert(await page.locator('#wf-start').isVisible(), `${locale} reduced motion action`);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.screenshot({ path: `output/playwright/${locale}-mini-ui-mobile.png`, fullPage: true });
    await page.keyboard.press('5');
    await page.waitForFunction(() => document.querySelector('#ag-command')?.textContent.includes('tools/demo.mjs'));
    await page.locator('[data-copy="cli"]').click();
    assert((await page.evaluate(() => navigator.clipboard.readText())).includes('tools/demo.mjs'), `${locale} command clipboard`);
    await page.keyboard.press('2');
  }

  const startedResponse = page.waitForResponse(response => response.url().endsWith('/api/workflows/start') && response.request().method() === 'POST');
  await page.locator('#wf-start').click();
  assert((await (await startedResponse).json()).ok, 'synthetic workflow accepted');
  await page.waitForFunction(() => document.querySelector('#run-status')?.textContent === 'done', undefined, { timeout: 20000 });
  assert(await page.locator('#run-reports a').count() >= 2, 'real synthetic CLI demo reports');

  assert(await page.locator('#run-progress').evaluate(progress => progress.value === progress.max), 'completed step progress');
  await page.locator('#run-filter').selectOption('failed');
  assert(await page.locator('#run-history [data-run]').count() === 0, 'history filtered by status');
  await page.locator('#run-filter').selectOption('all');
  assert(await page.locator('#run-history [data-run]').count() > 0, 'history restored');

  await page.keyboard.press('5');
  await page.locator('#ag-mission').selectOption('ocr');
  await page.locator('details:has(#ag-prompt) summary').click();
  await page.waitForFunction(() => document.querySelector('#ag-prompt')?.textContent.includes('not implemented'));
  assert(await page.locator('#ag-prompt').isVisible(), 'planning-only prompt preview');
  await page.keyboard.press('6');
  await page.locator('#rp-search').fill('demo-report');
  await page.locator('#rp-format').selectOption('html');
  assert(await page.locator('#report-grid a').count() === 1, 'report name and format filters');

  await page.goto(base + '?lang=pl#' + 'audit');
  await page.locator('[data-wf="pc"]').click();
  assert(!(await page.locator('#wf-share').isChecked()), 'computer inventory defaults to offline');
  const computerRequests = [];
  await page.route('**/api/workflows/start', route => {
    computerRequests.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true, run: { runId: 'fixture-computer', title: 'Synthetic inventory' } } });
  });
  for (const share of [false, true]) {
    await page.locator('#wf-consent').check();
    await page.locator('#wf-share').setChecked(share);
    const request = page.waitForResponse(response => response.url().endsWith('/api/workflows/start'));
    await page.locator('#wf-start').click();
    await request;
  }
  assert(computerRequests[0]?.sharePackageNames === false && computerRequests[1]?.sharePackageNames === true, 'sharing requires the separate switch');
  await page.unroute('**/api/workflows/start');

  for (const locale of ['pl', 'en']) {
    const run = { runId: 'run-approval-fixture', status: 'awaiting_approval', title: 'Synthetic approval', steps: [], reports: [], pendingApproval: { kind: 'scope', token: 'synthetic-approval-token', root: '/synthetic/project', files: ['package.json', 'src/example.ts'] } };
    let approved = false;
    await page.route('**/api/status', route => route.fulfill({ json: { agents: {}, sessions: [], reports: [], runs: [run] } }));
    await page.route('**/api/workflows/approve', route => {
      approved = route.request().postDataJSON().approvalToken === 'synthetic-approval-token';
      run.status = 'completed'; run.pendingApproval = null;
      return route.fulfill({ json: { ok: true, run } });
    });
    await page.goto(base + '?lang=' + locale + '#audit');
    await page.locator('#wf-approve').waitFor();
    assert((await page.locator('#run-scope').innerText()).includes('src/example.ts'), `${locale} exact scope displayed`);
    await page.locator('#wf-approve').press('Enter');
    await page.locator('#run-approval').waitFor({ state: 'hidden' });
    assert(approved, `${locale} scoped approval token submitted`);
    await page.unroute('**/api/status');
    await page.unroute('**/api/workflows/approve');
  }

  const untrusted = '<img src=x alt="synthetic fixture">';
  await page.route('**/api/status', route => route.fulfill({ json: {
    agents: {}, sessions: [], reports: [], runs: [{ runId: 'run-text-fixture', status: 'completed', title: untrusted, nextStep: untrusted, steps: [{ label: untrusted, status: 'completed' }], reports: [] }]
  } }));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#run-history')?.textContent.includes('<img'));
  assert(await page.locator('#run-history img, #run-steps img').count() === 0, 'untrusted details rendered as text');
  await page.unroute('**/api/status');
  assert(errors.length === 0, 'uncaught browser errors');
  return { passed: checks.length, errors };
}
