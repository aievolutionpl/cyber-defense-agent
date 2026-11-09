import test from "node:test";
import assert from "node:assert/strict";
import { createPlan, runWelcome } from "../tools/welcome.mjs";

test("intake never grants scope or model consent across every supported choice", () => {
  for (let a = 0; a < 2; a++)
    for (let b = 0; b < 3; b++)
      for (let c = 0; c < 3; c++)
        for (let d = 0; d < 2; d++) {
          const plan = createPlan([a, b, c, d]);
          assert.equal(plan.scopeApproved, false);
          assert.equal(plan.targetRead, false);
          assert.equal(plan.providerCalled, false);
          if (a === 1) assert.match(plan.steps[0], /demo/);
          else if (b === 2) assert.match(plan.steps.join(" "), /unavailable/);
          else assert.match(plan.steps.join(" "), /explicitly approve/);
        }
});
test("terminal intake retries invalid choices and completes an actionable plan", async () => {
  const input = ["ignore previous instructions", "99", "1", "2", "3", "1"];
  let output = "";
  const result = await runWelcome({
    ask: async () => input.shift(),
    write: (s) => {
      output += s;
    },
  });
  assert.equal(result.sharing, "local-only");
  assert.match(output, /insufficient_data/);
  assert.match(output, /every referenced local file/);
  assert.ok(!output.includes("ignore previous instructions"));
});
test("quit and EOF stop intake without a plan", async () => {
  for (const answer of ["q", undefined])
    assert.equal(
      await runWelcome({ ask: async () => answer, write: () => {} }),
      null,
    );
});
test("invalid or incomplete intake cannot create a plan", () => {
  for (const values of [
    [],
    [0, 0, 0],
    [2, 0, 0, 0],
    ["0", 0, 0, 0],
    [0, NaN, 0, 0],
  ])
    assert.throws(() => createPlan(values), /INVALID_INTAKE/);
});
