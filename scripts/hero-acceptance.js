async (page) => {
  const base = page.url().replace(/pl\/$/, "").replace(/\/$/, "") + "/";
  const checks = [];
  const assert = (v, n) => {
    if (!v) throw new Error(n);
    checks.push(n);
  };
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  const story = page.locator(".defense-story");
  await page.waitForFunction(
    () => document.querySelector(".defense-story")?.dataset.playing === "true",
  );
  const first = await story.getAttribute("data-step");
  await page.waitForFunction(
    (previous) =>
      document.querySelector(".defense-story")?.dataset.step !== previous,
    first,
  );
  assert(true, "hero sequence advances automatically");
  const controls = story.locator(".story-steps button");
  for (let index = 0; index < 5; index++) {
    await controls.nth(index).focus();
    await controls.nth(index).press("Enter");
    assert(
      (await story.getAttribute("data-step")) === String(index),
      `keyboard selects stage ${index + 1}`,
    );
  }
  assert(
    (await story.innerText()).includes("Network scanning: roadmap"),
    "network scan is disclosed as roadmap",
  );
  await controls.nth(3).click();
  assert(
    (await story.innerText()).includes("Apply it outside this tool"),
    "human remediation remains explicit",
  );
  const held = await story.getAttribute("data-step");
  await page.waitForTimeout(4000);
  assert(
    (await story.getAttribute("data-step")) === held,
    "manual selection remains stable",
  );
  await story
    .getByRole("button", { name: "Replay the sequence", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector(".defense-story")?.dataset.step === "1",
  );
  assert(true, "replay resumes even while its button has focus");
  await page
    .getByRole("button", { name: "Pause animations", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector(".defense-story")?.dataset.playing === "false",
  );
  const paused = await story.getAttribute("data-step");
  await page.waitForTimeout(4000);
  assert(
    (await story.getAttribute("data-step")) === paused,
    "global pause stops phase updates",
  );
  await page
    .getByRole("button", { name: "Resume animations", exact: true })
    .click();
  await page.locator("#trust").scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => document.querySelector(".defense-story")?.dataset.playing === "false",
  );
  assert(true, "offscreen hero stops its timer");
  await story.scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () => document.querySelector(".defense-story")?.dataset.playing === "false",
  );
  assert(
    await page
      .locator(".scene-scan")
      .evaluate((el) => getComputedStyle(el).display === "none"),
    "reduced motion removes scan beam",
  );
  await controls.nth(4).click();
  assert(
    (await story.getAttribute("data-step")) === "4",
    "manual stages work with reduced motion",
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert(await page.locator('.hero h1 span').evaluate(el => el.getBoundingClientRect().right <= innerWidth), `headline fits ${width}px`);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `reflow ${width}px`,
    );
  }
  const image = await story
    .locator('.story-frame[data-active="true"]')
    .evaluate((img) => ({
      loaded: img.complete && img.naturalWidth > 0,
      alt: img.alt,
    }));
  assert(
    image.loaded && image.alt.length > 30,
    "generated artwork loads with descriptive alt text",
  );
  const frames = await story.locator('.story-frame').evaluateAll(images => images.map(img => ({src:img.src,loaded:img.complete && img.naturalWidth>0})));
  assert(frames.length === 5 && new Set(frames.map(img=>img.src)).size === 5, "five distinct generated frames are present");
  assert(frames.every(img=>img.loaded), "all five frames load successfully");
  assert(await story.locator('.isometric-vector-stage').isVisible(), "isometric vector stage is rendered");
  assert(await story.locator('.hero-xray-hud').isVisible(), "live code X-Ray HUD is visible");
  assert(await story.locator('.iso-trace-pulse').count() === 4, "four animated circuit traces are active");
  return { passed: checks.length, checks };
}
