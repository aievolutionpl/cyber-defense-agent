import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeStateFile, readStateFile } from "../tools/safe-write.mjs";
import { saveModelConfig, loadModelConfig, storeApiKey } from "../tools/providers.mjs";

const tmp = (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cda-safe-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const skip = process.platform === "win32" && "symlinks need extra privileges on Windows";

test("state writes are atomic, private and refuse linked targets and ancestors", { skip }, (t) => {
  const root = tmp(t);
  const outside = tmp(t);
  const victim = path.join(outside, "victim.txt");
  fs.writeFileSync(victim, "KEEP ME");
  const file = path.join(root, ".cda", "x.json");
  writeStateFile(root, file, "one");
  assert.equal(readStateFile(root, file), "one");
  if (process.platform !== "win32") assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  fs.rmSync(file);
  fs.symlinkSync(victim, file);
  assert.throws(() => writeStateFile(root, file, "evil"), /STATE_LINK_BLOCKED/);
  assert.throws(() => readStateFile(root, file), /STATE_LINK_BLOCKED/);
  fs.rmSync(file);
  fs.linkSync(victim, file);
  assert.throws(() => writeStateFile(root, file, "evil"), /STATE_LINK_BLOCKED/);
  fs.rmSync(file);
  const root2 = tmp(t);
  fs.symlinkSync(outside, path.join(root2, ".cda"));
  assert.throws(() => writeStateFile(root2, path.join(root2, ".cda", "x.json"), "evil"), /STATE_LINK_BLOCKED/);
  assert.equal(fs.readFileSync(victim, "utf8"), "KEEP ME");
  assert.ok(!fs.existsSync(path.join(outside, "x.json")));
});

test("model config and credentials cannot be redirected through links", { skip }, (t) => {
  const root = tmp(t);
  const outside = tmp(t);
  const victim = path.join(outside, "victim.txt");
  fs.writeFileSync(victim, "KEEP ME");
  fs.mkdirSync(path.join(root, ".cda"));
  fs.symlinkSync(victim, path.join(root, ".cda", "config.json"));
  assert.throws(() => saveModelConfig({ provider: "ollama" }, root), /STATE_LINK_BLOCKED/);
  assert.equal(loadModelConfig(root).provider, null, "a linked config is ignored when reading");
  const home = tmp(t);
  fs.mkdirSync(path.join(home, "cyber-defense-agent"));
  fs.symlinkSync(victim, path.join(home, "cyber-defense-agent", "credentials.json"));
  assert.throws(() => storeApiKey("openrouter", "sk-or-v1-abcdefghijklmnop", { CDA_CONFIG_HOME: home }), /STATE_LINK_BLOCKED/);
  assert.equal(fs.readFileSync(victim, "utf8"), "KEEP ME");
});

test("agent sessions and guided runs refuse a linked state directory", { skip }, async (t) => {
  const { startGuidedAudit } = await import("../tools/ui.mjs");
  const root = tmp(t);
  const outside = tmp(t);
  fs.mkdirSync(path.join(root, ".cda"));
  fs.symlinkSync(outside, path.join(root, ".cda", "runs"));
  assert.throws(() => startGuidedAudit({ workflow: "demo" }, { rootDir: root, stepRunner: async () => "" }), /STATE_LINK_BLOCKED/);
  assert.deepEqual(fs.readdirSync(outside), []);
});
