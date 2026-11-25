import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StateStore } from "../tools/scope.mjs";
import { collect, renderVisual } from "../tools/visual.mjs";
import { createPdf } from "../tools/pdf.mjs";
import { exportReportPdf, startMiniUi } from "../tools/ui.mjs";

const pdfBytes = Buffer.from("%PDF-1.7\n" + "synthetic-test ".repeat(100));
function fixture(t) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "cda-panel-pdf-test-"));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  const store = new StateStore(rootDir);
  store.write("reports", "review", renderVisual(collect([]), { lang: "pl" }), "html");
  return { rootDir, store };
}

test("PDF export requires consent, a plain HTML name and an unlinked generated report", async t => {
  const { rootDir } = fixture(t);
  let called = false;
  const options = { rootDir, pdfCreator: async () => { called = true; } };
  await assert.rejects(exportReportPdf({ report: "review.html" }, options), /CONSENT_REQUIRED/);
  for (const report of ["../review.html", "a/b.html", "review.json", "a:review.html", "https://example.com/x.html"]) {
    await assert.rejects(exportReportPdf({ report, consent: true }, options), /INVALID_REPORT_NAME/);
  }
  const report = path.join(rootDir, ".cda", "reports", "review.html");
  fs.linkSync(report, path.join(rootDir, ".cda", "reports", "linked.html"));
  await assert.rejects(exportReportPdf({ report: "linked.html", consent: true }, options), /STATE_LINK_BLOCKED/);
  assert.equal(called, false);
});

test("PDF export caches identical snapshots and creates a new PDF when the source changes", async t => {
  const { rootDir, store } = fixture(t); let calls = 0;
  const pdfCreator = async (html, destination) => { calls++; assert.match(html, /default-src 'none'/); fs.writeFileSync(destination, pdfBytes); return { bytes: pdfBytes.length }; };
  const params = { report: "review.html", consent: true };
  const first = await exportReportPdf(params, { rootDir, pdfCreator });
  const cached = await exportReportPdf(params, { rootDir, pdfCreator });
  assert.equal(first.name, cached.name); assert.equal(calls, 1);
  store.write("reports", "review", renderVisual(collect([]), { title: "Different report" }), "html");
  const changed = await exportReportPdf(params, { rootDir, pdfCreator });
  assert.notEqual(changed.name, first.name); assert.equal(calls, 2);
});

test("concurrent exports of the same report share one job without blocking status requests", async t => {
  const { rootDir } = fixture(t); let complete; let calls = 0;
  const gate = new Promise(resolve => { complete = resolve; });
  const ui = await startMiniUi({ port: 0, rootDir, openBrowser: false, agentsMap: {}, pdfCreator: async (html, destination) => { calls++; await gate; fs.writeFileSync(destination, pdfBytes); return { bytes: pdfBytes.length }; } });
  t.after(() => ui.server.close());
  const send = () => fetch(`${ui.url}api/reports/pdf`, { method: "POST", headers: { "Content-Type": "application/json", "x-cda-token": ui.token }, body: JSON.stringify({ report: "review.html", consent: true }) });
  const jobs = [send(), send()];
  const status = await fetch(`${ui.url}api/status`); assert.equal(status.status, 200);
  complete();
  const results = await Promise.all(jobs.map(async job => (await job).json()));
  assert.equal(calls, 1); assert.equal(results[0].name, results[1].name);
  const download = await fetch(`${ui.url}report/${results[0].name}?download=1`);
  assert.equal(download.headers.get("content-type"), "application/pdf");
  assert.match(download.headers.get("content-disposition"), /^attachment;/);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), pdfBytes);
  const forbidden = await fetch(`${ui.url}api/reports/pdf`, { method: "POST", body: "{}" });
  assert.equal(forbidden.status, 403);
});

test("PDF printing uses an isolated local snapshot and rejects missing or invalid output", async t => {
  const { rootDir } = fixture(t);
  const destination = path.join(rootDir, "result.pdf");
  await assert.rejects(createPdf("<head></head>", destination, { browser: null }), /NO_CHROMIUM_BROWSER_FOUND/);
  let input;
  await createPdf("<head></head><body>sample</body>", destination, { browser: "fake-browser", run: async (command, args, options) => {
    assert.equal(options.shell, false); assert.equal(options.windowsHide, true);
    assert.ok(args.some(arg => arg.startsWith("--user-data-dir=")));
    assert.ok(args.at(-1).startsWith("file:")); input = new URL(args.at(-1));
    assert.match(fs.readFileSync(input, "utf8"), /default-src 'none'/);
    fs.writeFileSync(args.find(arg => arg.startsWith("--print-to-pdf=")).slice(15), pdfBytes);
  } });
  assert.equal(fs.existsSync(input), false);
  assert.deepEqual(fs.readFileSync(destination), pdfBytes);
  await assert.rejects(createPdf("<head></head>", path.join(rootDir, "bad.pdf"), { browser: "fake", run: async () => {} }), /PDF_PRINT_FAILED/);
});
