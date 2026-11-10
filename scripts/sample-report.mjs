#!/usr/bin/env node
// Rebuilds the committed sample deliverable from the synthetic inputs in examples/report-demo/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collect, renderVisual, printPdf } from "../tools/visual.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, "examples", "report-demo");
const named = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))]);
const data = collect(named);
for (const [lang, file] of [["en", "sample-audit-report"], ["pl", "sample-audit-report-pl"]]) {
  const html = path.join(root, "examples", `${file}.html`);
  fs.writeFileSync(html, renderVisual(data, { title: lang === "pl" ? "Audyt: sklep.example (dane przykładowe)" : "Audit: shop.example (sample data)", lang, now: Date.parse("2026-11-10T10:00:00Z") }));
  const result = printPdf(html, path.join(root, "examples", `${file}.pdf`));
  process.stdout.write(`${file}: html written, pdf ${result.pdf ? "written" : `skipped (${result.reason})`}\n`);
}
