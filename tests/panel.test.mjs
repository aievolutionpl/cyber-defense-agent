import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { buildOverview, chatWithModel, postureScore, readStoredReports } from "../tools/panel-api.mjs";
import { startMiniUi } from "../tools/ui.mjs";

const tmp = (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cda-panel-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const web = (findings) => ({ format: "cda.web.v1", finalUrl: "https://example.test/", policy: { requests: 3 }, findings });
function seed(root) {
  const dir = path.join(root, ".cda", "reports");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "site.json"), JSON.stringify(web([
    { id: "W1", priority: "P0", title: "Admin panel open <script>x</script>", evidence: "Set-Cookie: s=SECRETVALUE", fix: "Restrict /admin to 10.0.0.5 on internal.acme.corp" },
    { id: "W2", priority: "P2", title: "HSTS missing", evidence: "no header", fix: "Add HSTS" },
  ])));
  return dir;
}

test("posture score is a bounded reading aid and null without evidence", () => {
  assert.equal(postureScore({ P0: 0, P1: 0, P2: 0, P3: 0 }, 0), null);
  assert.equal(postureScore({ P0: 0, P1: 0, P2: 0, P3: 0 }, 1), 100);
  assert.equal(postureScore({ P0: 1, P1: 1, P2: 1, P3: 1 }, 1), 100 - 30 - 12 - 4 - 1);
  assert.equal(postureScore({ P0: 9 }, 1), 0);
});

test("overview summarises stored reports without unredacted secrets", (t) => {
  const root = tmp(t);
  seed(root);
  fs.writeFileSync(path.join(root, ".cda", "reports", "broken.json"), "{not json");
  const o = buildOverview(root);
  assert.equal(o.verdict, "act");
  assert.equal(o.counts.P0, 1);
  assert.equal(o.sources, 1);
  assert.equal(o.findings.length, 2);
  assert.equal(o.findings[0].priority, "P0");
  assert.equal(readStoredReports(root).length, 1, "unreadable reports are skipped");
  assert.equal(buildOverview(tmp(t)).score, null);
});

test("panel chat needs consent, scrubs a focused finding and bounds history", async (t) => {
  const root = tmp(t);
  seed(root);
  await assert.rejects(chatWithModel({ provider: "openrouter", messages: [{ role: "user", content: "hi" }] }, { rootDir: root }), /CONSENT_REQUIRED/);
  await assert.rejects(chatWithModel({ provider: "openrouter", consent: true, messages: [] }, { rootDir: root }), /INVALID_MESSAGES/);
  let sent;
  const call = async (req) => { sent = req; return { provider: req.provider, model: "m", text: "Answer <script>bad()</script>", ms: 1200 }; };
  const focused = await chatWithModel({ provider: "openrouter", consent: true, lang: "en", messages: [{ role: "user", content: "Explain" }], focus: { priority: "P0", area: "website", title: "Admin open at /srv/app/admin", fix: "Restrict to 10.0.0.5 on internal.acme.corp" } }, { rootDir: root, call });
  const out = sent.messages.at(-1).content;
  for (const leak of ["/srv/app", "10.0.0.5", "internal.acme.corp"]) assert.ok(!out.includes(leak), leak);
  assert.match(out, /<cda-data>/);
  assert.equal(focused.attached, "finding");
  assert.equal(focused.sentContent, out, "the client receives the exact scrubbed turn to keep in history");
  assert.ok(!focused.text.includes("<script>"));
  const withReports = await chatWithModel({ provider: "openrouter", consent: true, messages: [{ role: "user", content: "Plan?" }], attachReports: true }, { rootDir: root, call });
  assert.match(withReports.attached, /^reports:2\/2$/);
  assert.ok(!sent.messages.at(-1).content.includes("SECRETVALUE"));
  const long = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x".repeat(5000) }));
  long.push({ role: "user", content: "last" });
  await chatWithModel({ provider: "openrouter", consent: true, messages: long }, { rootDir: root, call });
  assert.ok(sent.messages.reduce((n, m) => n + m.content.length, 0) <= 45000);
  assert.equal(sent.messages.at(-1).content, "last");
});

test("panel serves its own files under a strict CSP and new APIs stay token-gated", async (t) => {
  const root = tmp(t);
  seed(root);
  const ui = await startMiniUi({ port: 0, openBrowser: false, rootDir: root });
  t.after(() => ui.server.close());
  const page = await fetch(ui.url);
  const html = await page.text();
  const csp = page.headers.get("content-security-policy");
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-inline/);
  assert.ok(html.includes(`content="${ui.token}"`));
  assert.ok(!/<script>(?!<\/script>)/.test(html) && !html.includes("onclick="), "no inline script or handlers");
  for (const file of ["panel.js", "panel.css", "panel-icon.svg"]) assert.equal((await fetch(`${ui.url}${file}`)).status, 200, file);
  // The served script must compile: a syntax error would disable every panel control.
  const script = await (await fetch(`${ui.url}panel.js`)).text();
  assert.doesNotThrow(() => new vm.Script(script));
  assert.equal((await fetch(`${ui.url}panel.mjs`)).status, 404);
  const overview = await (await fetch(`${ui.url}api/overview`)).json();
  assert.equal(overview.counts.P0, 1);
  const noToken = await fetch(`${ui.url}api/model/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent: true, provider: "ollama", messages: [{ role: "user", content: "x" }] }) });
  assert.equal(noToken.status, 403);
  const noConsent = await fetch(`${ui.url}api/model/chat`, { method: "POST", headers: { "Content-Type": "application/json", "x-cda-token": ui.token }, body: JSON.stringify({ provider: "ollama", messages: [{ role: "user", content: "x" }] }) });
  assert.equal(noConsent.status, 403);
  assert.equal((await noConsent.json()).error, "CONSENT_REQUIRED");
  // A long conversation fits the chat endpoint's own body allowance (other endpoints stay at 16 KB).
  const big = { provider: "ollama", messages: [{ role: "user", content: "q" }, { role: "assistant", content: "a".repeat(17000) }, { role: "user", content: "next" }] };
  const bigChat = await fetch(`${ui.url}api/model/chat`, { method: "POST", headers: { "Content-Type": "application/json", "x-cda-token": ui.token }, body: JSON.stringify(big) });
  assert.equal((await bigChat.json()).error, "CONSENT_REQUIRED", "parsed, then refused for missing consent");
  const bigOther = await fetch(`${ui.url}api/model/config`, { method: "POST", headers: { "Content-Type": "application/json", "x-cda-token": ui.token }, body: JSON.stringify({ pad: "x".repeat(20000) }) });
  assert.equal((await bigOther.json()).error, "PAYLOAD_TOO_LARGE");
});

test("an explicitly empty model selects the provider default instead of the saved override", async (t) => {
  const root = tmp(t);
  fs.mkdirSync(path.join(root, ".cda"), { recursive: true });
  fs.writeFileSync(path.join(root, ".cda", "config.json"), JSON.stringify({ provider: "openrouter", model: "old-model" }));
  const seen = [];
  const call = async (req) => { seen.push(req.model); return { provider: req.provider, model: "m", text: "ok", ms: 1 }; };
  const base = { provider: "openrouter", consent: true, messages: [{ role: "user", content: "q" }] };
  await chatWithModel({ ...base, model: "" }, { rootDir: root, call });
  await chatWithModel(base, { rootDir: root, call });
  await chatWithModel({ ...base, model: "new-model" }, { rootDir: root, call });
  assert.deepEqual(seen, [null, "old-model", "new-model"]);
});

test("reports reached through symlinks never enter the overview or a model brief", { skip: process.platform === "win32" && "symlinks need extra privileges on Windows" }, async (t) => {
  const root = tmp(t);
  const dir = seed(root);
  const outside = tmp(t);
  fs.writeFileSync(path.join(outside, "secret.json"), JSON.stringify(web([{ id: "X", priority: "P0", title: "CONFIDENTIAL external finding", evidence: "e", fix: "f" }])));
  fs.symlinkSync(path.join(outside, "secret.json"), path.join(dir, "linked.json"));
  assert.ok(!JSON.stringify(buildOverview(root)).includes("CONFIDENTIAL"));
  assert.deepEqual(readStoredReports(root).map(([n]) => n), ["site"]);
  let sent = "";
  const { explainReportsWithModel } = await import("../tools/ui.mjs");
  await explainReportsWithModel({ provider: "openrouter", consent: true, reports: ["linked", "site"] }, { rootDir: root, call: async (req) => { sent = req.messages[0].content; return { provider: "openrouter", model: "m", text: "ok", ms: 1 }; } });
  assert.ok(sent && !sent.includes("CONFIDENTIAL"));
});
