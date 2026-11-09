async (page) => {
  const checks = [], errors = [], badResponses = [];
  const assert = (condition, name) => { if (!condition) throw new Error(name); checks.push(name); };
  const base = page.url().replace(/pl\/$/, '').replace(/\/$/, '') + '/';
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(new URL(base).origin)) badResponses.push(`${response.status()} ${response.url()}`); });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin });
  const links = new Set();
  for (const locale of ['en', 'pl']) {
    const pl = locale === 'pl';
    await page.goto(base + (pl ? 'pl/' : ''));
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert(await page.locator('html').getAttribute('lang') === locale, `${locale}: server document language`);
    assert(await page.locator('h1').count() === 1, `${locale}: single primary headline`);
    const scopeTab = page.getByRole('tab', { name: pl ? 'Zakres' : 'Scope', exact: true });
    await scopeTab.click();
    assert(await scopeTab.getAttribute('aria-selected') === 'true', `${locale}: scope tab`);
    await scopeTab.press('ArrowRight');
    assert(await page.getByRole('tab', { name: pl ? 'Ustalenia' : 'Findings', exact: true }).getAttribute('aria-selected') === 'true', `${locale}: report keyboard tabs`);
    await page.locator('#hero-evidence-summary').focus();
    await page.locator('#hero-evidence-summary').press('Enter');
    assert(await page.locator('.report-preview details').getAttribute('open') !== null, `${locale}: evidence keyboard disclosure`);
    await page.getByRole('tab', { name: 'Retest', exact: true }).click();
    assert(await page.getByRole('heading', { name: pl ? 'Poprawka potwierdzona.' : 'Fix confirmed.', exact: true }).isVisible(), `${locale}: preview retest`);

    const onboarding = page.locator('.onboarding');
    const choose = async label => { await onboarding.getByRole('button', { name: label, exact: true }).click(); };
    await choose(pl ? 'Lokalne repozytorium' : 'A local repository');
    await choose(pl ? 'Przegląd przed wydaniem' : 'Review before release');
    await choose(pl ? 'Tylko package.json' : 'Only package.json');
    assert(await onboarding.locator('.onboarding-plan').isVisible(), `${locale}: onboarding produces a plan`);
    assert((await onboarding.locator('.onboarding-plan').innerText()).includes('package.json'), `${locale}: plan reflects file choice`);
    await choose(pl ? 'Zmień odpowiedzi' : 'Change answers');
    await choose(pl ? 'Plan izolowanego labu' : 'An isolated lab plan');
    await choose(pl ? 'Weryfikacja poprawek' : 'Verify the fixes');
    await choose(pl ? 'Manifest i raport SARIF' : 'Manifest and SARIF report');
    assert((await onboarding.locator('.onboarding-plan').innerText()).includes(pl ? 'roadmapie' : 'roadmap'), `${locale}: lab plan respects execution boundary`);

    const demo = page.locator('.guided-demo');
    await demo.getByRole('button', { name: pl ? 'Przejdź do zakresu' : 'Define the scope', exact: true }).click();
    const approve = demo.getByRole('button', { name: pl ? 'Zatwierdź i zobacz wynik' : 'Approve and inspect findings', exact: true });
    assert(await approve.isDisabled(), `${locale}: consent gates demo`);
    await demo.getByRole('button', { name: pl ? 'Pokaż próbę wyjścia poza zakres' : 'Try an out-of-scope action' }).click();
    assert((await demo.locator('.blocked-result').innerText()).includes(pl ? 'Zablokowano' : 'Blocked'), `${locale}: out-of-scope action blocked`);
    const consent = demo.getByRole('checkbox');
    await consent.focus(); await consent.press('Space'); await approve.click();
    const next = demo.getByRole('button', { name: pl ? 'Zobacz retest po poprawce' : 'See the retest after remediation' });
    assert(await next.isDisabled(), `${locale}: evidence gates retest`);
    await page.locator('#guided-evidence-summary').focus(); await page.locator('#guided-evidence-summary').press('Enter'); await next.click();
    assert((await demo.locator('.result-card').innerText()).includes('confirmed_fixed'), `${locale}: full workflow confirms bounded fix`);
    await demo.getByRole('button', { name: pl ? 'Porównaj: niepełny raport' : 'Compare an incomplete report' }).click();
    assert((await demo.locator('.result-card').innerText()).includes('insufficient_data'), `${locale}: incomplete data does not establish fix`);
    await demo.screenshot({ path: `output/playwright/${locale}-demo-incomplete.png` });
    await demo.getByRole('button', { name: pl ? 'Zacznij od nowa' : 'Start again' }).click();
    assert(await demo.locator('.repo-choice').isVisible(), `${locale}: demo resets`);

    for (const [host, command, prompt] of [['Codex', 'codex', '$cyber-defense demo'], ['Claude Code', 'claude', '/cyber-defense demo'], ['Hermes', 'node tools/demo.mjs', 'Read skills/cyber-defense/SKILL.md']]) {
      await page.getByRole('tab', { name: host, exact: true }).click();
      await page.getByRole('button', { name: `${pl ? 'Skopiuj polecenia' : 'Copy commands for'} ${host}`, exact: true }).click();
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      assert(clip.includes('--branch codex/node-v0.1') && clip.endsWith(command), `${locale}: ${host} clipboard commands`);
      await page.getByRole('button', { name: `${pl ? 'Skopiuj prompt' : 'Copy prompt for'} ${host}`, exact: true }).click();
      assert((await page.evaluate(() => navigator.clipboard.readText())).startsWith(prompt), `${locale}: ${host} clipboard prompt`);
    }
    await page.getByRole('tab', { name: 'Hermes', exact: true }).press('Home');
    assert(await page.getByRole('tab', { name: 'Codex', exact: true }).getAttribute('aria-selected') === 'true', `${locale}: installation Home key`);
    const faq = page.locator('.faq-list details').first();
    await faq.locator('summary').focus(); await faq.locator('summary').press('Enter');
    assert(await faq.getAttribute('open') !== null, `${locale}: FAQ keyboard`);
    await faq.locator('summary').press('Enter');
    const unresolved = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="#"]')).map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.getElementById(h.slice(1))));
    assert(!unresolved.length, `${locale}: all section anchors resolve`);
    const external = await page.locator('a[href^="https://"]').evaluateAll(as => as.map(a => a.getAttribute('href')));
    external.forEach(link => links.add(link));
    assert(external.every(h => h.startsWith('https://github.com/aievolutionpl/cyber-defense-agent/') && h.includes('codex/node-v0.1')), `${locale}: GitHub links use actual unified repository`);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale}: reflow ${width}px`);
      if (width === 390) {
        const menu = page.getByRole('button', { name: pl ? 'Menu nawigacji' : 'Navigation menu' });
        await menu.focus(); await menu.press('Enter');
        assert(await menu.getAttribute('aria-expanded') === 'true', `${locale}: mobile menu keyboard`);
        await page.locator('#mobile-menu a').first().focus(); await page.locator('#mobile-menu a').first().press('Escape');
        assert(await menu.getAttribute('aria-expanded') === 'false', `${locale}: menu Escape and focus restore`);
        await menu.press('Enter'); await page.locator('#mobile-menu a[href="#install"]').click();
        assert(await menu.getAttribute('aria-expanded') === 'false', `${locale}: menu closes after link`);
      }
      await page.getByRole('tab', { name: pl ? 'Ustalenia' : 'Findings', exact: true }).click();
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const pause = page.getByRole('button', { name: pl ? 'Wstrzymaj animacje' : 'Pause animations', exact: true });
      if (await pause.count()) await pause.click();
      await page.screenshot({ path: `output/playwright/${locale}-${width}-hero.png` });
      if (width === 1440 || width === 390) await page.screenshot({ path: `output/playwright/${locale}-${width}-full.png`, fullPage: true });
      const resume = page.getByRole('button', { name: pl ? 'Wznów animacje' : 'Resume animations', exact: true });
      if (await resume.count()) await resume.click();
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.documentElement.dataset.motion === 'paused');
    assert(await page.locator('.agent-build-overlay').evaluate(el => getComputedStyle(el).display === 'none'), `${locale}: reduced motion disables overlay`);
    assert(await page.locator('.hero-media video').evaluate(el => el.paused), `${locale}: reduced motion pauses video`);
    assert(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior === 'auto'), `${locale}: reduced motion disables smooth scrolling`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.documentElement.dataset.motion === 'running');
    await page.getByRole('button', { name: pl ? 'Wstrzymaj animacje' : 'Pause animations', exact: true }).click();
    assert(await page.locator('.hero-media video').evaluate(el => el.paused), `${locale}: pause stops video`);
    assert(await page.locator('.agent-build-overlay').getAttribute('data-active') === 'false', `${locale}: pause stops overlay`);
    await page.getByRole('button', { name: pl ? 'Wznów animacje' : 'Resume animations', exact: true }).click();
  }
  await page.goto(base);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.operations-board').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('.operations-board').dataset.buildStage === 'assembled');
  assert(await page.locator('.agent-build-overlay').evaluate(el => getComputedStyle(el).pointerEvents === 'none'), 'cursor overlay cannot intercept controls');
  await page.locator('.operations-board').screenshot({ path: 'output/playwright/defense-overview.png' });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(() => document.documentElement.dataset.motion === 'running');
  await page.getByRole('link', { name: 'PL', exact: true }).click();
  assert(await page.locator('html').getAttribute('lang') === 'pl', 'locale link navigates to Polish document');
  await page.getByRole('link', { name: 'EN', exact: true }).click();
  assert(await page.locator('html').getAttribute('lang') === 'en', 'locale link navigates to English document');
  const nojs = await page.context().browser().newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const fallback = await nojs.newPage(); await fallback.goto(base);
  assert(await fallback.locator('h1').isVisible() && await fallback.locator('.repo-choice').isVisible(), 'no-JS content and demo introduction remain visible');
  await nojs.close();
  for (const locale of ['en', 'pl']) {
    const pl = locale === 'pl';
    await page.goto(base + (pl ? 'pl/' : ''));
    const intake = page.locator('.onboarding');
    await intake.getByRole('button', { name: pl ? 'Raport JSON / SARIF' : 'A JSON / SARIF report', exact: true }).click();
    await intake.getByRole('button', { name: pl ? 'Uporządkowanie ryzyk' : 'Prioritise the risks', exact: true }).click();
    await intake.getByRole('button', { name: pl ? 'Tylko package.json' : 'Only package.json', exact: true }).click();
    assert((await intake.locator('.onboarding-plan').innerText()).includes(pl ? 'Bez raportu import nie jest możliwy' : 'Import cannot proceed without the report'), `${locale}: intake does not widen missing import scope`);
    await page.locator('.responsibility-note a').click();
    assert(page.url().endsWith(pl ? '/pl/policies/' : '/policies/'), `${locale}: policy link resolves with base path`);
    assert(await page.locator('html').getAttribute('lang') === locale, `${locale}: policy document language`);
    assert(await page.locator('.policy-sections section').count() === 8, `${locale}: full privacy and responsible-use policy`);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale}: policy reflow ${width}px`);
    }
    await page.screenshot({ path: `output/playwright/${locale}-policies.png`, fullPage: true });
    assert(await page.evaluate(() => !localStorage.length && !sessionStorage.length && !document.cookie), `${locale}: application creates no cookies or browser storage`);
    const back = page.getByRole('link', { name: pl ? 'Wróć do prezentacji' : 'Back to the presentation', exact: true });
    await back.focus(); await back.press('Enter');
    assert(await page.locator('.hero').isVisible(), `${locale}: keyboard return from policy`);
    await page.locator('#trust').screenshot({ path: `output/playwright/${locale}-trust.png` });
  }
  assert(errors.length === 0, 'no uncaught browser or hydration errors');
  assert(badResponses.length === 0, 'no failing same-origin asset requests');
  return { passed: checks.length, checks, links: [...links], errors, badResponses };
}
