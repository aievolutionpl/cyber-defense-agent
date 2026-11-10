#!/usr/bin/env node
import { collect, renderVisual, printPdf } from "./visual.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { StateStore, ScopedReader, propose, approve } from "./scope.mjs";
import { review, importScan, retest, render } from "./engine.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const store = new StateStore(root);
const files = ["package.json", "reports/before.sarif", "reports/partial.json"];
const fixture = new ScopedReader(path.join(root, "examples/demo-repo"), files);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "cda-demo-"));
// This command only modifies its own newly created demonstration copy.
for (const file of files) {
  const target = path.join(scratch, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, fixture.read(file), { flag: "wx" });
}
const scope = approve(propose(scratch, files), scratch, true);
store.write("scopes", "demo", scope);
const save = (name, data) => {
  store.write("reports", name, data);
  store.write("reports", name, render(data), "md");
  return data;
};
const before = save("demo-before", review(scope));
const imported = save("demo-import", importScan(scope, "reports/before.sarif"));
const pkg = JSON.parse(new ScopedReader(scratch, files).read("package.json"));
pkg.dependencies.lodash = "4.17.21";
fs.writeFileSync(
  path.join(scratch, "package.json"),
  `${JSON.stringify(pkg, null, 2)}\n`,
);
const after = save("demo-after", review(scope));
const result = save("demo-retest", retest(scope, imported, after));
const partial = save("demo-partial", importScan(scope, "reports/partial.json"));
const incomplete = save("demo-no-data", retest(scope, before, partial));
let blocked;
try {
  new ScopedReader(scratch, files).read("../private/.env");
} catch (error) {
  blocked = error.code;
}
if (
  result.results[0]?.status !== "confirmed_fixed" ||
  incomplete.results[0]?.status !== "insufficient_data" ||
  !blocked
)
  throw new Error("DEMO_FAILED");
// The demo ends the way every audit should: with a visual report, before any fixing starts.
const visual = store.write("reports", "demo-report", renderVisual(collect([["demo-before", before], ["demo-import", imported]]), { title: "Demo audit: northstar / customer-portal" }), "html");
// Printing starts a browser process, so it happens only when asked for: node tools/demo.mjs --pdf
const printed = process.argv.includes("--pdf") ? printPdf(path.join(store.repoRoot, visual), store.file("reports", "demo-report", "pdf", true)) : { pdf: false };
process.stdout.write(
  `DEMO passed: SARIF import → evidence → remediate synthetic copy → retest.\nConfirmed fix: ${result.results[0].status}\nIncomplete report: ${incomplete.results[0].status}\nOut of scope: ${blocked}\nReports: .cda/reports/demo-{before,import,after,retest,no-data}.md\nVisual report: ${visual}${printed.pdf ? " and .cda/reports/demo-report.pdf" : " (HTML only; add --pdf to print it with a local Chromium-based browser)"}\nDemo scope: ${scratch}\nNo fixture code executed. No network calls.\n`,
);
