async (page) => {
  const checks = [], errors = [], badResponses = [];
  const assert = (condition, name) => { if (!condition) throw new Error(name); checks.push(name); };
  const base = page.url().replace(/(?:en|pl)\/$/, '').replace(/\/$/, '') + '/';
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(new URL(base).origin)) badResponses.push(response.url()); });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin });
  for (const locale of ['pl', 'en']) {
    const pl = locale === 'pl';
    const route = base + (pl ? '' : 'en/');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(route);
    await page.waitForFunction(() => !!document.documentElement.dataset.motion);
    assert(await page.locator('html').getAttribute('lang') === locale, `${locale} document language`);
    assert(await page.locator('h1').count() === 1, `${locale} primary heading`);
    assert(await page.getByText('Antigravity', { exact: true }).count() > 0, `${locale} host compatibility`);
    const planner = page.locator('#missions');
    const briefCopy = planner.getByRole('button', { name: pl ? 'Skopiuj brief audytu' : 'Copy audit brief', exact: true });
    const auditRequests = [];
    const watchRequests = request => { if (['fetch', 'xhr'].includes(request.resourceType())) auditRequests.push(request.url()); };
    page.on('request', watchRequests);
    const briefs = new Set();
    for (const [id, doc] of [['project', 'code-review'], ['agents', 'agent-security'], ['web', 'web-application'], ['computer', 'software-vulnerabilities'], ['database', 'databases'], ['network', 'network'], ['incident', 'incident-first-response']]) {
      const goal = planner.locator(`#mission-${id}`);
      await goal.focus(); await goal.press('Enter');
      assert(await goal.getAttribute('aria-pressed') === 'true' && await planner.locator('button[aria-pressed="true"]').count() === 1, `${locale} ${id} keyboard selection`);
      assert(await planner.locator(`a[href$="/${doc}.md"]`).count() === 1, `${locale} ${id} review reference`);
      for (const host of ['codex', 'claude']) {
        await planner.locator('#mission-host').selectOption(host);
        await page.waitForFunction(prefix => document.querySelector('.mission-prompt code')?.textContent.startsWith(prefix), host === 'codex' ? '$cyber-defense ' : '/cyber-defense ');
        await briefCopy.click();
        await page.waitForFunction(() => ['Copied', 'Skopiowano'].includes(document.querySelector('#mission-detail [role="status"]')?.textContent));
        const brief = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
        assert(brief === await planner.locator('.mission-prompt code').innerText() && brief.startsWith(host === 'codex' ? '$cyber-defense ' : '/cyber-defense '), `${locale} ${id} ${host} complete brief clipboard`);
        assert(!/--yes|--authorized|--share-package-names/.test(brief), `${locale} ${id} ${host} no executable consent flags`);
        briefs.add(brief);
      }
    }
    assert(briefs.size === 14, `${locale} distinct mission and host briefs`);
    page.off('request', watchRequests);
    assert(auditRequests.length === 0, `${locale} planner makes no audit requests`);
    await planner.locator('#mission-agents').click();
    assert(await briefCopy.innerText() === (pl ? 'Kopiuj' : 'Copy'), `${locale} changed brief clears copied feedback`);
    const install = page.locator('#install');
    for (const [host, command, prompt] of [
      ['Codex CLI', '--host codex', '$cyber-defense'],
      ['Claude Code CLI', '--host claude', '/cyber-defense'],
      [pl ? 'Mini Interfejs GUI' : 'Mini Web UI', 'tools/cda.mjs ui', 'node tools/demo.mjs'],
      [pl ? 'Terminal Pro (PL/EN)' : 'Pro Terminal (PL/EN)', 'tools/cda.mjs start', 'node tools/demo.mjs'],
    ]) {
      await install.getByRole('tab', { name: host, exact: true }).click();
      await install.getByRole('button', { name: `${pl ? 'Skopiuj polecenia' : 'Copy commands for'} ${host}`, exact: true }).click();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      assert(copied.includes('git clone --branch codex/node-v0.1') && copied.includes(command), `${locale} ${host} command clipboard`);
      await install.getByRole('button', { name: `${pl ? 'Skopiuj prompt' : 'Copy prompt for'} ${host}`, exact: true }).click();
      assert((await page.evaluate(() => navigator.clipboard.readText())).startsWith(prompt), `${locale} ${host} prompt clipboard`);
    }
    await install.getByRole('tab', { name: pl ? 'Terminal Pro (PL/EN)' : 'Pro Terminal (PL/EN)', exact: true }).press('Home');
    assert(await install.getByRole('tab', { name: 'Claude Code CLI', exact: true }).getAttribute('aria-selected') === 'true', `${locale} tab keyboard navigation`);
    await install.getByRole('tab', { name: pl ? 'Mini Interfejs GUI' : 'Mini Web UI', exact: true }).click();
    for (const scenario of (pl ? ['Audyt kodu', 'Komputer i CVE', 'Strona WWW'] : ['Code Audit', 'Computer & CVEs', 'Website Check'])) {
      await install.getByRole('button', { name: scenario, exact: true }).click();
      await install.getByRole('button', { name: `${pl ? 'Skopiuj prompt' : 'Copy prompt for'} ${pl ? 'Mini Interfejs GUI' : 'Mini Web UI'}`, exact: true }).click();
      assert((await page.evaluate(() => navigator.clipboard.readText())) === 'node tools/cda.mjs start', `${locale} ${scenario} starts intake without consent`);
    }
    const faq = page.locator('.faq-list details').first();
    await faq.locator('summary').focus(); await faq.locator('summary').press('Enter');
    assert(await faq.getAttribute('open') !== null, `${locale} FAQ keyboard disclosure`);
    await faq.locator('summary').press('Enter');
    const missing = await page.locator('a[href^="#"]').evaluateAll(links => links.map(link => link.getAttribute('href')).filter(href => href.length > 1 && !document.getElementById(href.slice(1))));
    assert(missing.length === 0, `${locale} section anchors`);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale} reflow ${width}`);
      await planner.locator('#mission-agents').click();
      await page.locator('#mission-detail').scrollIntoViewIfNeeded();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale} planner reflow ${width}`);
      if (width === 390 || width === 1440) await page.screenshot({ path: `output/playwright/${locale}-planner-${width}.png` });
      if (width === 390) {
        const menu = page.getByRole('button', { name: pl ? 'Menu nawigacji' : 'Navigation menu' });
        await menu.focus(); await menu.press('Enter');
        assert(await menu.getAttribute('aria-expanded') === 'true', `${locale} mobile menu keyboard`);
        await page.locator('#mobile-menu a').first().focus(); await page.locator('#mobile-menu a').first().press('Escape');
        assert(await menu.getAttribute('aria-expanded') === 'false', `${locale} mobile menu Escape`);
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.documentElement.dataset.motion !== 'running');
    assert(await page.locator('h1').isVisible(), `${locale} reduced motion content`);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Clipboard denied for acceptance test'); } } }));
    await briefCopy.click();
    assert(await planner.locator('.copy-fallback').isVisible(), `${locale} visible manual-copy fallback`);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: `output/playwright/${locale}-verified-site.png` });
    await page.locator(`footer a[href="${new URL(base).pathname}${pl ? '' : 'en/'}policies/"]`).click();
    assert(await page.locator('html').getAttribute('lang') === locale, `${locale} policy language`);
    assert(await page.locator('.policy-sections section').count() === 8, `${locale} policy content`);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1, null, { timeout: 3000 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale} policy reflow ${width}`);
    }
    await page.getByRole('link', { name: pl ? 'Wróć do prezentacji' : 'Back to the presentation', exact: true }).click();
    await page.waitForURL(route);
    assert(await page.locator('h1').isVisible(), `${locale} policy return`);
  }
  assert(errors.length === 0, 'uncaught browser errors');
  assert(badResponses.length === 0, 'failed local responses');
  return { passed: checks.length, errors, badResponses };
}
