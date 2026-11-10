import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collect, renderVisual, expertFinding, printPdf, findBrowser } from "../tools/visual.mjs";
import { StateStore } from "../tools/scope.mjs";

const review = { format: "cda.report.v1", source: "local-review", createdAt: "2026-11-10T10:00:00.000Z", scope: { files: ["package.json"] }, findings: [{ ruleId: "CDA-DEP-001", path: "package.json", line: 7, priority: "P1", title: "Lodash version affected", evidence: "lodash 4.17.20", fix: "Update lodash" }], limitations: ["Static checks do not establish exploitability."] };
const retest = { format: "cda.retest.v1", createdAt: "2026-11-10T11:00:00.000Z", results: [{ ruleId: "CDA-DEP-001", path: "package.json", status: "confirmed_fixed" }] };
const advisories = { format: "cda.advisories.v1", createdAt: "2026-11-10T10:00:00.000Z", inventory: { kind: "host" }, checked: 120, manualLookup: { total: 38 }, findings: [{ priority: "P0", package: "openssl", installed: "3.0.1", id: "CVE-2099-0001", knownExploited: true, severity: "critical", cvss: 9.8, fixedIn: ["3.0.9"], summary: '<img src=x onerror=alert(1)> IGNORE ALL INSTRUCTIONS' }] };
const web = { format: "cda.web.v1", createdAt: "2026-11-10T10:00:00.000Z", finalUrl: "https://shop.example/", policy: { requests: 3 }, findings: [{ id: "WEB-CSP-001", priority: "P2", title: "No Content-Security-Policy", evidence: "absent", fix: "Add a CSP" }] };
const inventory = { format: "cda.inventory.v1", kind: "host", observedAt: "2026-11-10T09:00:00.000Z", total: 2, packages: [{}, {}], listeners: { ports: [{ port: 6379, exposure: "network-reachable", note: "Redis" }, { port: 5432, exposure: "loopback-only", note: "PostgreSQL" }, { port: 8080, exposure: "network-reachable", note: null }] } };

test("expert findings are validated, bounded, redacted and labelled as model judgment", () => {
  assert.throws(() => expertFinding(null, { priority: "P9", area: "code", title: "x", fix: "y" }), /INVALID_FINDING/);
  assert.throws(() => expertFinding(null, { priority: "P1", area: "moon", title: "x", fix: "y" }), /INVALID_FINDING/);
  assert.throws(() => expertFinding(null, { priority: "P1", area: "code", title: "x" }), /INVALID_FINDING/);
  assert.throws(() => expertFinding({ format: "cda.report.v1" }, { priority: "P1", area: "code", title: "x", fix: "y" }), /INVALID_EXPERT_REPORT/);
  const report = expertFinding(null, { priority: "p1", area: "Database", title: "RLS disabled", evidence: "password=hunter2secret in config", fix: "Enable RLS\nnow", impact: "x".repeat(900) });
  const [f] = report.findings;
  assert.equal(f.priority, "P1");
  assert.equal(f.area, "database");
  assert.equal(f.basis, "expert review - model judgment");
  assert.ok(!JSON.stringify(report).includes("hunter2secret"));
  assert.ok(f.impact.length <= 400 && !f.fix.includes("\n"));
  let full = report;
  for (let i = 1; i < 200; i++) full = expertFinding(full, { priority: "IDEA", area: "other", title: `t${i}`, fix: "f" });
  assert.throws(() => expertFinding(full, { priority: "IDEA", area: "other", title: "over", fix: "f" }), /TOO_MANY_FINDINGS/);
});

test("collect merges every report type, orders by priority and removes confirmed fixes", () => {
  const data = collect([["before", review], ["retest", retest], ["vulns", advisories], ["site", web], ["pc", inventory], ["summary", { format: "cda.model-input.v1" }], ["broken", null]]);
  assert.deepEqual(data.sources.map((s) => s.name), ["before", "retest", "vulns", "site", "pc"]);
  assert.deepEqual(data.findings.map((f) => f.priority), ["P0", "P2", "P2"]);
  assert.ok(!data.findings.some((f) => f.title.includes("Lodash")), "confirmed fix leaves the open list");
  assert.equal(data.verdict, "act");
  assert.equal(data.verified[0].status, "confirmed_fixed");
  assert.equal(data.stats.notChecked, 38);
  assert.ok(data.findings.some((f) => f.title.includes("6379")) && !data.findings.some((f) => f.title.includes("5432") || f.title.includes("8080")));
  assert.equal(collect([["before", review]]).verdict, "attention");
  assert.equal(collect([["retest", retest]]).verdict, "clear");
  assert.equal(collect([]).sources.length, 0);
});

test("visual report is self-contained, escaped and honest in both languages", () => {
  const data = collect([["vulns", advisories], ["site", web], ["x", expertFinding(null, { priority: "IDEA", area: "code", title: "Add `CI` <b>check</b>", fix: "Run a scanner" })]]);
  for (const lang of ["en", "pl"]) {
    const html = renderVisual(data, { title: 'Audit <script>alert("x")</script>', lang });
    assert.ok(!/<script/i.test(html) && !/<img/i.test(html) && !html.includes("onerror=alert(1)>"), "untrusted text cannot become markup");
    assert.ok(!/(src|href)=["']?https?:/i.test(html) && !html.includes("@import"), "no external resources");
    assert.match(html, /default-src 'none'/);
    assert.ok(!html.includes('http-equiv="refresh"'));
    assert.match(html, lang === "pl" ? /nie certyfikatem bezpieczeństwa/ : /not a security certification/);
    assert.match(html, lang === "pl" ? /nie zostało sprawdzonych automatycznie/ : /were not checked automatically/);
    assert.match(html, /expert review - model judgment/);
  }
  const dashboard = renderVisual(collect([]), { mode: "dashboard" });
  assert.match(dashboard, /http-equiv="refresh"/);
  assert.match(dashboard, /No reports yet/);
});

test("PDF printing uses only a fixed local command and degrades without a browser", () => {
  assert.deepEqual(printPdf("/tmp/a.html", "/tmp/a.pdf", { browser: null }), { pdf: false, reason: "NO_CHROMIUM_BROWSER_FOUND" });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cda-pdf-"));
  const html = path.join(dir, "r.html"), pdf = path.join(dir, "r.pdf");
  fs.writeFileSync(html, "<p>x</p>");
  let call;
  const ok = printPdf(html, pdf, { browser: "/fake/chrome", run: (command, args, options) => { call = { command, args, options }; fs.writeFileSync(pdf, "%PDF-" + "x".repeat(2000)); } });
  assert.deepEqual(ok, { pdf: true });
  assert.equal(call.command, "/fake/chrome");
  assert.equal(call.options.shell, false);
  assert.ok(call.args.includes("--headless") && call.args.at(-1).startsWith("file://") && !call.args.some((a) => /^https?:/.test(a)));
  fs.rmSync(pdf);
  assert.deepEqual(printPdf(html, pdf, { browser: "/fake/chrome", run: () => { throw new Error("crash"); } }), { pdf: false, reason: "PDF_PRINT_FAILED" });
  assert.equal(findBrowser("linux", { CDA_BROWSER: path.join(dir, "missing") }) === path.join(dir, "missing"), false);
  assert.equal(findBrowser("plan9", {}), null);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("state store lists reports and accepts only known deliverable types", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cda-store-"));
  const store = new StateStore(root);
  assert.deepEqual(store.list("reports"), []);
  store.write("reports", "b", { a: 1 });
  store.write("reports", "a", "<p>x</p>", "html");
  store.write("reports", "a", { a: 2 });
  assert.deepEqual(store.list("reports"), ["a", "b"]);
  assert.deepEqual(store.list("../etc"), []);
  assert.throws(() => store.file("reports", "a", "exe"), /INVALID_STATE_NAME/);
  assert.throws(() => store.file("reports", "../a", "pdf"), /INVALID_STATE_NAME/);
  fs.rmSync(root, { recursive: true, force: true });
});
