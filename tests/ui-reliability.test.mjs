import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { Script } from "node:vm";
import {
  approveGuidedAudit,
  buildAgentBridge,
  cancelGuidedAudit,
  getGuidedAudit,
  getAgentSessions,
  launchAgentSession,
  resolveContainedPath,
  resolveAgentBinary,
  resumeGuidedAudit,
  startGuidedAudit,
  startMiniUi,
  stopAgentSession,
  verifyLocalRequest,
} from "../tools/ui.mjs";
import { StateStore } from "../tools/scope.mjs";
import { collect } from "../tools/visual.mjs";

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cda-ui-reliability-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function fakeAgent() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => true;
  return child;
}

test("panel paths reject directory links and hardlinked files", (t) => {
  const directory = fixture(t);
  const outside = path.join(directory, "outside");
  const project = path.join(directory, "project");
  fs.mkdirSync(outside);
  fs.mkdirSync(project);
  fs.symlinkSync(outside, path.join(project, ".cda"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => resolveContainedPath(project, ".cda", "sessions"), /LINK_BLOCKED/);

  fs.writeFileSync(path.join(outside, "original.json"), "{}");
  fs.linkSync(path.join(outside, "original.json"), path.join(project, "alias.json"));
  assert.throws(() => resolveContainedPath(project, "alias.json"), /LINK_BLOCKED/);
});

test("panel origin verification requires the actual listener port", () => {
  assert.throws(() => verifyLocalRequest({ headers: { host: "127.0.0.1:3109", origin: "http://localhost" } }, 3109), /INVALID_ORIGIN/);
  assert.throws(() => verifyLocalRequest({ headers: { host: "127.0.0.1" } }, 3109), /INVALID_HOST_HEADER/);
});

test("agent cancellation survives output and process close events", (t) => {
  const rootDir = fixture(t);
  const child = fakeAgent();
  const result = launchAgentSession({ host: "codex", mission: "demo" }, {
    rootDir,
    openTerminalWindow: false,
    agentsMap: { codex: { name: "Codex", installed: true, executablePath: "/trusted/codex", version: "test" } },
    spawnImpl: () => child,
  });
  stopAgentSession(result.session.sessionId, rootDir);
  child.stdout.emit("data", "late output");
  child.emit("close", null);
  assert.equal(getAgentSessions(rootDir)[0].status, "cancelled");
});

test("stopping a completed agent session preserves its result", (t) => {
  const rootDir = fixture(t);
  const child = fakeAgent();
  const result = launchAgentSession({ host: "codex", mission: "demo" }, {
    rootDir,
    openTerminalWindow: false,
    agentsMap: { codex: { name: "Codex", installed: true, executablePath: "/trusted/codex", version: "test" } },
    spawnImpl: () => child,
  });
  child.emit("close", 0);
  const stopped = stopAgentSession(result.session.sessionId, rootDir);
  assert.equal(stopped.status, "completed");
});

test("agent output redacts streamed secrets and successful configuration advice stays completed", (t) => {
  const rootDir = fixture(t);
  const child = fakeAgent();
  launchAgentSession({ host: "codex", mission: "code" }, {
    rootDir,
    agentsMap: { codex: { name: "Codex", installed: true, executablePath: "/trusted/codex" } },
    spawnImpl: () => child,
  });
  child.stdout.emit("data", "Review OPENAI_API_KEY configuration.\npassword=synthetic-");
  child.stdout.emit("data", "private-value\n-----BEGIN PRIVATE KEY-----\nsynthetic-key-material");
  const during = getAgentSessions(rootDir)[0];
  assert.doesNotMatch(during.output, /synthetic-|private-value/);
  child.emit("close", 0);
  const completed = getAgentSessions(rootDir)[0];
  assert.equal(completed.status, "completed");
  assert.equal(completed.authError, false);
  assert.match(completed.output, /REDACTED/);
});

test("background Codex sessions use the noninteractive exec entry point", (t) => {
  const rootDir = fixture(t);
  let invocation;
  const child = fakeAgent();
  const result = launchAgentSession({ host: "codex", mission: "code", target: "project's folder" }, {
    rootDir,
    openTerminalWindow: false,
    agentsMap: { codex: { name: "Codex", installed: true, executablePath: "/trusted/codex", version: "test" } },
    spawnImpl: (command, args) => { invocation = { command, args }; return child; },
  });
  assert.equal(invocation.args[0], "exec");
  assert.equal(invocation.args.at(-1), result.session.prompt);
  child.emit("close", 0);
});

test("computer workflow pauses before sharing package names", async (t) => {
  const rootDir = fixture(t);
  const executed = [];
  const run = await startGuidedAudit({ workflow: "pc", consent: true }, {
    rootDir,
    awaitCompletion: true,
    stepRunner: async (step) => { executed.push(step.id); return "{}"; },
  });
  assert.deepEqual(executed, ["inventory"]);
  assert.equal(run.status, "awaiting_approval");
  assert.equal(run.pendingApproval.kind, "package_names");
});

test("project workflow requires an explicit file list", (t) => {
  const rootDir = fixture(t);
  fs.writeFileSync(path.join(rootDir, "package.json"), "{}");
  assert.throws(() => startGuidedAudit({ workflow: "project", target: rootDir, consent: true }, { rootDir, stepRunner: async () => "{}" }), /EXPLICIT_FILES_REQUIRED/);
});

test("approval tokens authorize one pending step and resume cannot bypass them", async (t) => {
  const rootDir = fixture(t);
  const executed = [];
  const stepRunner = async (step) => { executed.push(step.id); return "{}"; };
  const run = await startGuidedAudit({ workflow: "pc", consent: true }, { rootDir, stepRunner, awaitCompletion: true });
  await resumeGuidedAudit(run.runId, { rootDir, stepRunner, awaitCompletion: true });
  assert.deepEqual(executed, ["inventory"]);
  const pending = getGuidedAudit(run.runId, rootDir);
  await assert.rejects(approveGuidedAudit(run.runId, { rootDir, approvalToken: "wrong" }), /APPROVAL_REQUIRED/);
  const completed = await approveGuidedAudit(run.runId, { rootDir, approvalToken: pending.pendingApproval.token, stepRunner, awaitCompletion: true });
  assert.equal(completed.status, "completed");
  assert.deepEqual(executed, ["inventory", "advisories", "report"]);
});

test("concurrent resumes wait for cancellation and execute unfinished steps once", async (t) => {
  const rootDir = fixture(t);
  let release;
  let started;
  const entered = new Promise((resolve) => { started = resolve; });
  const blocked = new Promise((resolve) => { release = resolve; });
  let executions = 0;
  const stepRunner = async (step) => {
    if (step.id === "demo") {
      executions += 1;
      if (executions === 1) { started(); await blocked; }
    }
    return "{}";
  };
  const run = await startGuidedAudit({ workflow: "demo" }, { rootDir, stepRunner });
  await entered;
  cancelGuidedAudit(run.runId, { rootDir });
  const first = resumeGuidedAudit(run.runId, { rootDir, stepRunner, awaitCompletion: true });
  const second = resumeGuidedAudit(run.runId, { rootDir, stepRunner, awaitCompletion: true });
  release();
  const results = await Promise.all([first, second]);
  assert.ok(results.every((result) => result.status === "completed"));
  assert.equal(executions, 2);
  assert.equal(cancelGuidedAudit(run.runId, { rootDir }).status, "completed");
});

test("generated shell commands preserve prompts containing shell metacharacters", (t) => {
  const rootDir = fixture(t);
  const script = path.join(rootDir, "arguments.mjs");
  fs.writeFileSync(script, "console.log(JSON.stringify(process.argv.slice(2)));\n");
  const bridge = buildAgentBridge({ host: "codex", mission: "code", target: "folder's $value `value` & (test)", executablePath: process.execPath, executableArgs: [script] });
  const shell = process.platform === "win32" ? "powershell.exe" : "/bin/sh";
  const args = process.platform === "win32" ? ["-NoProfile", "-NonInteractive", "-Command", bridge.cliCommand] : ["-c", bridge.cliCommand];
  const output = execFileSync(shell, args, { encoding: "utf8", windowsHide: true, timeout: 15_000 });
  assert.deepEqual(JSON.parse(output.trim()), [bridge.prompt]);
});

test("Windows npm agent shims resolve to Node with literal script arguments", { skip: process.platform !== "win32" }, (t) => {
  const rootDir = fixture(t);
  const directory = path.join(rootDir, "node_modules", "fixture");
  fs.mkdirSync(directory, { recursive: true });
  const script = path.join(directory, "cli.mjs");
  fs.writeFileSync(script, "console.log('fixture-agent 1.0');\n");
  const shim = path.join(rootDir, "codex.cmd");
  fs.writeFileSync(shim, '@echo off\n"%dp0%\\node_modules\\fixture\\cli.mjs" %*\n');
  const resolved = resolveAgentBinary("codex", {
    execSyncImpl: (command, args, options) => command === "where.exe" ? `${shim}\n` : execFileSync(command, args, options),
  });
  assert.equal(resolved.installed, true);
  assert.equal(resolved.commandPath, process.execPath);
  assert.deepEqual(resolved.commandArgs, [script]);
  assert.equal(resolved.version, "fixture-agent 1.0");
});

test("local panel serves both languages with valid scripts and blocks linked reports", async (t) => {
  const rootDir = fixture(t);
  const ui = await startMiniUi({ port: 0, rootDir, openBrowser: false, agentsMap: {} });
  t.after(() => ui.server.close());
  for (const lang of ["pl", "en"]) {
    const response = await fetch(`${ui.url}?lang=${lang}`);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("cache-control"), "no-store");
    const html = await response.text();
    assert.match(html, new RegExp(`<html lang="${lang}">`));
    assert.doesNotThrow(() => new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]));
    assert.ok(html.includes(lang === "pl" ? "Uruchom prowadzony audyt" : "Start guided audit"));
  }
  const store = new StateStore(rootDir);
  store.write("reports", "test-report", "<p>synthetic</p>", "html");
  const outside = path.join(rootDir, "outside.html");
  fs.writeFileSync(outside, "private fixture");
  fs.linkSync(outside, path.join(rootDir, ".cda", "reports", "linked.html"));
  const linked = await fetch(`${ui.url}report/linked.html`);
  assert.equal(linked.status, 403);
  assert.equal((await linked.json()).error, "STATE_LINK_BLOCKED");
  const valid = await fetch(`${ui.url}report/test-report.html`);
  assert.equal(valid.status, 200);
  assert.equal(await valid.text(), "<p>synthetic</p>");
});

test("legacy vendor catalog reports retain incomplete coverage instead of verified vulnerability counts", () => {
  const data = collect([["legacy", {
    format: "cda.advisories.v1", checked: 0, vendorCatalogChecked: 1,
    inventory: { kind: "host" }, manualLookup: { total: 0 },
    findings: [{ ecosystem: "Windows:VendorCatalog", priority: "P0", package: "Example", installed: "1.0", id: "CVE-2000-0001" }],
  }]]);
  assert.equal(data.verdict, "incomplete");
  assert.equal(data.findings.length, 0);
});

test("project workflow runs the real CLI only after exact scope approval", async (t) => {
  const rootDir = fixture(t);
  const trusted = path.join(rootDir, "trusted");
  const target = path.join(rootDir, "project");
  fs.mkdirSync(trusted);
  fs.mkdirSync(target);
  fs.cpSync(path.resolve("tools"), path.join(trusted, "tools"), { recursive: true });
  fs.writeFileSync(path.join(target, "package.json"), JSON.stringify({ dependencies: { lodash: "4.17.20" } }));
  const isolated = await import(pathToFileURL(path.join(trusted, "tools", "ui.mjs")));
  const pending = await isolated.startGuidedAudit({ workflow: "project", target, files: ["package.json"], consent: true }, { rootDir: trusted, awaitCompletion: true });
  assert.equal(pending.status, "awaiting_approval");
  assert.deepEqual(pending.pendingApproval.files, ["package.json"]);
  assert.equal(fs.existsSync(path.join(trusted, ".cda", "reports")), false);
  const completed = await isolated.approveGuidedAudit(pending.runId, { rootDir: trusted, approvalToken: pending.pendingApproval.token, awaitCompletion: true });
  assert.equal(completed.status, "completed", completed.error);
  const report = path.join(trusted, ".cda", "reports", `${completed.runId}-report.html`);
  assert.ok(fs.readFileSync(report, "utf8").includes("lodash"));
  const changed = await isolated.startGuidedAudit({ workflow: "project", target, files: ["package.json"], consent: true }, { rootDir: trusted, awaitCompletion: true });
  const store = new StateStore(trusted);
  const proposalName = `${changed.runId}-scope`;
  const proposal = store.read("scopes", proposalName);
  store.write("scopes", proposalName, { ...proposal, createdAt: new Date(Date.parse(proposal.createdAt) + 1).toISOString() });
  const rejected = await isolated.approveGuidedAudit(changed.runId, { rootDir: trusted, approvalToken: changed.pendingApproval.token, awaitCompletion: true });
  assert.equal(rejected.status, "failed");
  assert.match(rejected.error, /SCOPE_PROPOSAL_CHANGED/);
  assert.equal(rejected.steps.find((step) => step.id === "review").status, "pending");
});

test("legacy interrupted computer audits preserve the separate data-sharing approval", async (t) => {
  const rootDir = fixture(t);
  const original = await startGuidedAudit({ workflow: "pc", consent: true, sharePackageNames: true }, {
    rootDir, awaitCompletion: true,
    stepRunner: async (step) => { if (step.id === "advisories") throw new Error("INTERRUPTED"); return "{}"; },
  });
  delete original.approvals;
  for (const step of original.steps) delete step.requiresApproval;
  new StateStore(rootDir).write("runs", original.runId, original);
  const resumed = await resumeGuidedAudit(original.runId, { rootDir, awaitCompletion: true, stepRunner: async () => { throw new Error("UNEXPECTED_EXECUTION"); } });
  assert.equal(resumed.status, "awaiting_approval");
  assert.equal(resumed.pendingApproval.kind, "package_names");
});
