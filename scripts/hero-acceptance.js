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
    (await story.locator(".isometric-vector-stage").count()) === 1,
    "interactive isometric vector stage is rendered",
  );
  assert(
    (await story.locator(".hero-xray-hud").count()) === 1,
    "live code X-Ray HUD is rendered",
  );
  const storyText = await story.innerText();
  assert(
    storyText.includes("Network scanning: roadmap") ||
      storyText.includes("Skanowanie sieci: roadmapa"),
    "network scan is disclosed as roadmap",
  );
  await controls.nth(3).click();
  const step3Text = await story.innerText();
  assert(
    step3Text.includes("Apply it outside this tool") ||
      step3Text.includes("Zmianę wykonujesz poza narzędziem"),
    "human remediation remains explicit",
  );
  const held = await story.getAttribute("data-step");
  await page.waitForTimeout(4000);
  assert(
    (await story.getAttribute("data-step")) === held,
    "manual selection remains stable",
  );
  await story.locator(".story-replay").click();
  await page.waitForFunction(
    () => document.querySelector(".defense-story")?.dataset.step === "1",
  );
  assert(true, "replay resumes even while its button has focus");
  await page.locator(".nav-actions .motion-toggle").click();
  await page.waitForFunction(
    () => document.querySelector(".defense-story")?.dataset.playing === "false",
  );
  const paused = await story.getAttribute("data-step");
  await page.waitForTimeout(4000);
  assert(
    (await story.getAttribute("data-step")) === paused,
    "global pause stops phase updates",
  );
  await page.locator(".nav-actions .motion-toggle").click();
  await page.locator("#control").scrollIntoViewIfNeeded();
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
    // Reduced motion turns every style change into a near-zero transition, so the first
    // frames after a resize still hold the old layout. Assert on the settled layout.
    await page
      .waitForFunction(() => document.documentElement.scrollWidth <= innerWidth, null, { timeout: 3000 })
      .catch(() => {});
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `reflow ${width}px`,
    );
  }
  const image = await story
    .locator('img[data-active="true"]')
    .evaluate((img) => ({
      loaded: img.complete && img.naturalWidth > 0,
      alt: img.alt,
    }));
  assert(
    image.loaded && image.alt.length > 30,
    "generated artwork loads with descriptive alt text",
  );
  return { passed: checks.length, checks };
}
