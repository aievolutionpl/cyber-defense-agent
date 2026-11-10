#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  StateStore,
  PolicyError,
  propose,
  approve,
  authorized,
  deny,
  sha,
} from "./scope.mjs";
import { review, importScan, retest, render, validateReport } from "./engine.mjs";
import { compareReports, renderComparison, toSarif } from "./comparison.mjs";
import { onboarding } from "./onboarding.mjs";
import { modelSummary } from "./triage.mjs";
import { welcomeTerminal } from "./welcome.mjs";
import { detectAgents, buildAgentBridge, startMiniUi } from "./ui.mjs";
import { reviewUpdates, renderUpdatePlan } from "./updates.mjs";
import { collectInventory, depsInventory, renderInventory } from "./inventory.mjs";
import { checkAdvisories, renderAdvisories } from "./advisories.mjs";
import { checkWebsite, renderWeb } from "./web.mjs";
import { collect, renderVisual, expertFinding, printPdf } from "./visual.mjs";
import { runDetectionBenchmark, renderBenchmarkMarkdown } from "./benchmark.mjs";
import { markdown } from "./redact.mjs";

function gitStagedFiles(rootDir) {
  if (typeof rootDir !== "string" || !rootDir) deny("INVALID_ROOT");
  try {
    const out = execFileSync(
      "git",
      ["-C", rootDir, "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
      { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] },
    );
    return out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    deny("GIT_STAGED_UNAVAILABLE");
  }
}

export function renderPrComment(scope, retestReport) {
  authorized(scope);
  if (
    retestReport?.format !== "cda.retest.v1" ||
    !Array.isArray(retestReport.results)
  )
    deny("INCOMPATIBLE_REPORT");
  const rows = retestReport.results
    .map(
      (r) =>
        `| \`${markdown(r.ruleId)}\` | \`${markdown(r.path)}:${r.line}\` | **${r.priority}** | \`${markdown(r.status)}\` | ${markdown(r.reason)} |`,
    )
    .join("\n");
  return `### 🛡️ Cyber Defense Agent — Verification Proof\n\n| Rule | Location | Priority | Status | Evidence |\n|---|---|---|---|---|\n${rows || "| — | — | — | `clear` | No prior findings in scope. |"}\n\n- **New findings introduced:** ${retestReport.added?.length ?? 0}\n- **Execution boundary:** Local static verification only; no target code executed.\n`;
}

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const store = new StateStore(ROOT);
let dashboardScope;
const help = `Cyber Defense Agent v0.2 — evidence tools for a defensive agent (AI Evolution Polska)

Interactive Command Center & Agent Bridge
  node tools/cda.mjs start [--lang pl|en]
  node tools/cda.mjs ui [--lang pl|en] [--port 3109]
  node tools/cda.mjs agent [--host claude|codex] [--mission demo|code|pc|web|report] [--target <path|url>] [--lang pl|en]

Files you approve (read-only, exact allowlist, 24 h)
  node tools/cda.mjs scope --root <directory> --allow <file> [--allow <file>] --name <scope>
  node tools/cda.mjs approve --scope <scope> --root <directory> --yes
  node tools/cda.mjs show --scope <scope>
  node tools/cda.mjs onboarding --scope <scope>
  node tools/cda.mjs review --scope <scope> --name <report>
  node tools/cda.mjs import --scope <scope> --input <relative.json|relative.sarif> --name <report> [--format gitleaks|trivy|osv]
  node tools/cda.mjs deps --scope <scope> --input <lockfile> --name <inventory>
  node tools/cda.mjs updates --scope <scope> --input <inventory.json> --name <plan>
  node tools/cda.mjs retest --scope <scope> --before <report> --after <report> --name <retest>
  node tools/cda.mjs compare --scope <scope> --before <report> --after <report> --name <comparison>
  node tools/cda.mjs sarif --scope <scope> --report <report> --name <export>
  node tools/cda.mjs summary --scope <scope> --report <report> --name <summary>
  node tools/cda.mjs revoke --scope <scope>

This machine (read-only OS queries; needs the user's consent)
  node tools/cda.mjs inventory --name <inventory> --yes

Known vulnerabilities (sends package names + versions to OSV.dev; needs consent)
  node tools/cda.mjs advisories --inventory <inventory> --name <report> --share-package-names

A website you own or are authorized to assess (a few passive GET requests)
  node tools/cda.mjs web --url <https://...> --name <report> --authorized

Deliverables (local files only)
  node tools/cda.mjs finding --name <expert-report> --priority <P0|P1|P2|P3|IDEA> --area <area> --title <text> --fix <text> [--impact <text>] [--evidence <text>] [--verify <text>]
  node tools/cda.mjs report --name <audit-report> --from <report> [--from <report>] [--title <text>] [--lang en|pl] [--pdf]
  node tools/cda.mjs dashboard [--lang en|pl] [--scope <scope>]
  Add --scope <scope> to report or dashboard to show only that project's file reports.

The report is a dark, print-ready HTML file. With --pdf (after the user agrees) it also starts a locally
installed Chromium-based browser in headless mode to print that one file to PDF.
The dashboard (.cda/reports/dashboard.html) rebuilds itself after every command and refreshes in the browser.

Reports: .cda/reports/<name>.json and .md. Nothing is installed, changed or executed in a target.
Use only a trusted copy of these tools, outside the reviewed project.
`;

/** The dashboard is derived state: every stored report, re-rendered. Failure never blocks a command. */
function refreshDashboard(lang = "en", rootKey) {
  const named = [];
  for (const name of store.list("reports")) {
    try { named.push([name, store.read("reports", name)]); } catch { /* skip unreadable state */ }
  }
  const name = rootKey ? `dashboard-${rootKey.slice(0, 16)}-${lang}` : "dashboard";
  return store.write("reports", name, renderVisual(collect(named, { rootKey }), { lang, mode: "dashboard" }), "html");
}

async function main() {
  const { positionals, values: v } = parseArgs({
    allowPositionals: true,
    options: {
      root: { type: "string" },
      allow: { type: "string", multiple: true },
      name: { type: "string" },
      scope: { type: "string" },
      report: { type: "string" },
      input: { type: "string" },
      format: { type: "string" },
      before: { type: "string" },
      after: { type: "string" },
      retest: { type: "string" },
      "git-staged": { type: "boolean" },
      yes: { type: "boolean" },
      url: { type: "string" },
      from: { type: "string", multiple: true },
      title: { type: "string" },
      lang: { type: "string" },
      priority: { type: "string" },
      area: { type: "string" },
      impact: { type: "string" },
      evidence: { type: "string" },
      fix: { type: "string" },
      verify: { type: "string" },
      pdf: { type: "boolean" },
      inventory: { type: "string" },
      authorized: { type: "boolean" },
      "share-package-names": { type: "boolean" },
      host: { type: "string" },
      mission: { type: "string" },
      target: { type: "string" },
      port: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (v.help || !positionals.length) {
    process.stdout.write(help);
    return;
  }
  if (positionals.length !== 1) deny("INVALID_ARGUMENTS");
  const command = positionals[0];
  const permitted = {
    start: ["lang"],
    ui: ["lang", "port"],
    agent: ["host", "mission", "target", "lang"],
    benchmark: ["name", "lang"],
    scope: ["root", "allow", "git-staged", "name"],
    approve: ["scope", "root", "yes"],
    show: ["scope"],
    onboarding: ["scope"],
    summary: ["scope", "report", "name"],
    review: ["scope", "name"],
    import: ["scope", "input", "name", "format"],
    updates: ["scope", "input", "name"],
    deps: ["scope", "input", "name"],
    inventory: ["name", "yes"],
    advisories: ["inventory", "name", "share-package-names"],
    web: ["url", "name", "authorized"],
    finding: ["name", "priority", "area", "title", "impact", "evidence", "fix", "verify"],
    report: ["name", "from", "title", "lang", "pdf", "scope"],
    dashboard: ["lang", "scope"],
    retest: ["scope", "before", "after", "name"],
    "pr-comment": ["scope", "retest"],
    compare: ["scope", "before", "after", "name"],
    sarif: ["scope", "report", "name"],
    revoke: ["scope"],
  };
  if (
    !permitted[command] ||
    Object.keys(v).some((k) => !permitted[command].includes(k))
  )
    deny("INVALID_ARGUMENTS");
  if (command === "start") {
    if (v.lang && !["en", "pl"].includes(v.lang)) deny("INVALID_ARGUMENTS");
    await welcomeTerminal({ lang: v.lang });
    return;
  }
  if (command === "ui") {
    if (v.lang && !["en", "pl"].includes(v.lang)) deny("INVALID_ARGUMENTS");
    const port = v.port ? Number(v.port) : 3109;
    if (!Number.isInteger(port) || port < 1024 || port > 65535) deny("INVALID_ARGUMENTS");
    const ui = await startMiniUi({ port, lang: v.lang || "pl", openBrowser: true });
    process.stdout.write(
      `\n\x1b[38;2;52;211;153m╭──────────────────────────────────────────────────────────────────────────╮\x1b[0m\n` +
        `\x1b[38;2;52;211;153m│\x1b[0m  🛡️  \x1b[1mCYBER DEFENSE AGENT v0.2 — MINI INTERFACE & AGENT BRIDGE\x1b[0m            \x1b[38;2;52;211;153m│\x1b[0m\n` +
        `\x1b[38;2;52;211;153m│\x1b[0m  🌐 URL: \x1b[1m\x1b[38;2;56;189;248m${ui.url}\x1b[0m                                        \x1b[38;2;52;211;153m│\x1b[0m\n` +
        `\x1b[38;2;52;211;153m│\x1b[0m  🤖 Claude Code CLI & Codex CLI Bridge + Local 1-Click Runner            \x1b[38;2;52;211;153m│\x1b[0m\n` +
        `\x1b[38;2;52;211;153m╰──────────────────────────────────────────────────────────────────────────╯\x1b[0m\n` +
        `Press Ctrl+C to stop the local interface.\n`,
    );
    await new Promise((resolve) => process.once("SIGINT", resolve));
    ui.server.close();
    return;
  }
  if (command === "agent") {
    if (v.lang && !["en", "pl"].includes(v.lang)) deny("INVALID_ARGUMENTS");
    if (v.host && !["claude", "codex"].includes(v.host)) deny("INVALID_ARGUMENTS");
    const lang = v.lang || "pl";
    const pl = lang === "pl";
    const agents = detectAgents();
    const bridge = buildAgentBridge({
      host: v.host || "claude",
      mission: v.mission || "demo",
      target: v.target || "",
      lang,
    });
    process.stdout.write(
      `\n\x1b[38;2;52;211;153m╭────────────────────────────────────────────────────────────────────────────╮\x1b[0m\n` +
        `\x1b[38;2;52;211;153m│\x1b[0m  🤖 \x1b[1mCYBER DEFENSE AGENT v0.2 — ${pl ? "MOSTEK CLAUDE CODE & CODEX CLI" : "CLAUDE CODE & CODEX CLI BRIDGE"}\x1b[0m             \x1b[38;2;52;211;153m│\x1b[0m\n` +
        `\x1b[38;2;52;211;153m├────────────────────────────────────────────────────────────────────────────┤\x1b[0m\n` +
        `\x1b[38;2;52;211;153m│\x1b[0m  • Claude Code CLI: ${agents.claude.installed ? `\x1b[38;2;52;211;153m✓ (${agents.claude.version})\x1b[0m` : "\x1b[38;2;251;191;36m○ skill ready (.claude/skills/cyber-defense)\x1b[0m"}\n` +
        `\x1b[38;2;52;211;153m│\x1b[0m  • OpenAI Codex CLI: ${agents.codex.installed ? `\x1b[38;2;52;211;153m✓ (${agents.codex.version})\x1b[0m` : "\x1b[38;2;251;191;36m○ skill ready (.agents/skills/cyber-defense)\x1b[0m"}\n` +
        `\x1b[38;2;52;211;153m╰────────────────────────────────────────────────────────────────────────────╯\x1b[0m\n` +
        `\n\x1b[1m1. ${pl ? "Uruchom bezpośrednio z terminala:" : "Run directly from terminal:"}\x1b[0m\n` +
        `   \x1b[38;2;167;243;208m${bridge.cliCommand}\x1b[0m\n\n` +
        `\x1b[1m2. ${pl ? "Lub wklej w otwartej sesji agenta:" : "Or paste inside an active agent session:"}\x1b[0m\n` +
        `   \x1b[38;2;248;250;252m${bridge.prompt}\x1b[0m\n\n`,
    );
    return;
  }
  if (command === "scope") {
    const allowed = [
      ...(v.allow ?? []),
      ...(v["git-staged"] ? gitStagedFiles(v.root) : []),
    ];
    const scope = propose(v.root, allowed);
    store.write("scopes", v.name, scope);
    process.stdout.write(
      `${JSON.stringify(scope, null, 2)}\nAwaiting explicit approval. No file content read.\n`,
    );
    return;
  }
  if (command === "finding") {
    let existing = null;
    try { existing = store.read("reports", v.name); } catch (error) { if (error.code !== "ENOENT") throw error; }
    const report = expertFinding(existing, v);
    const output = store.write("reports", v.name, report);
    process.stdout.write(`${JSON.stringify({ output, findings: report.findings.length, basis: "expert review - model judgment" })}\n`);
    return;
  }
  if (command === "report") {
    if (!v.from?.length || v.from.length > 20 || (v.lang && !["en", "pl"].includes(v.lang))) deny("INVALID_ARGUMENTS");
    const selected = v.scope ? store.read("scopes", v.scope) : null;
    if (selected) authorized(selected);
    if (selected) dashboardScope = sha(selected.root);
    const data = collect(v.from.map((name) => [name, store.read("reports", name)]), { rootKey: selected ? sha(selected.root) : undefined });
    if (!data.sources.length) deny("NO_SUPPORTED_REPORTS");
    const html = store.write("reports", v.name, renderVisual(data, { title: v.title?.slice(0, 120), lang: v.lang ?? "en" }), "html");
    const pdfPath = store.file("reports", v.name, "pdf", true);
    // Starting a browser process is its own consent step: never implied by asking for a report.
    const printed = v.pdf === true ? printPdf(path.join(ROOT, html), pdfPath) : { pdf: false, reason: "PDF_NOT_REQUESTED" };
    process.stdout.write(`${JSON.stringify({ html, pdf: printed.pdf ? path.relative(ROOT, pdfPath).replaceAll("\\", "/") : null, pdfNote: printed.pdf ? null : printed.reason === "PDF_NOT_REQUESTED" ? "HTML only. Re-run with --pdf after the user agrees to start a local browser, or open the HTML and use Print > Save as PDF" : `${printed.reason}: open the HTML in a browser and use Print > Save as PDF`, verdict: data.verdict, counts: data.counts, sources: data.sources.length })}\n`);
    return;
  }
  if (command === "dashboard") {
    if (v.lang && !["en", "pl"].includes(v.lang)) deny("INVALID_ARGUMENTS");
    const selected = v.scope ? store.read("scopes", v.scope) : null;
    if (selected) authorized(selected);
    process.stdout.write(`${JSON.stringify({ output: refreshDashboard(v.lang, selected ? sha(selected.root) : undefined) })}\n`);
    return;
  }
  if (command === "benchmark") {
    if (v.lang && !["en", "pl"].includes(v.lang)) deny("INVALID_ARGUMENTS");
    const name = v.name || "detection-benchmark";
    const report = runDetectionBenchmark();
    store.write("reports", name, report);
    const output = store.write("reports", name, renderBenchmarkMarkdown(report, v.lang || "pl"), "md");
    process.stdout.write(
      `${JSON.stringify({
        output,
        samplesTotal: report.samplesTotal,
        truePositives: report.truePositives,
        falsePositives: report.falsePositives,
        missedFindings: report.missedFindings,
        precision: report.precision,
        recall: report.recall,
        f1: report.f1,
        evidenceCompleteness: report.evidenceCompleteness,
      })}\n`,
    );
    return;
  }
  if (command === "inventory") {
    const report = collectInventory({ consent: v.yes });
    store.write("reports", v.name, report);
    const output = store.write("reports", v.name, renderInventory(report), "md");
    process.stdout.write(
      `${JSON.stringify({
        output,
        packages: report.total,
        sources: report.sources,
        automaticallyCheckable: report.packages.filter((p) => p.ecosystem).length,
        vendorCatalogVerified: report.verification?.verifiedVendorCatalog ?? 0,
        verifiedTotal: report.verification?.verifiedTotal ?? report.packages.filter((p) => p.ecosystem).length,
        needsManualCheck: report.verification?.needsManualCheck ?? 0,
        networkReachablePorts: report.listeners.ports.filter((p) => p.exposure === "network-reachable").map((p) => p.port),
        network: false,
      })}\n`,
    );
    return;
  }
  if (command === "advisories") {
    const report = await checkAdvisories(store.read("reports", v.inventory), { consent: v["share-package-names"] });
    store.write("reports", v.name, report);
    const output = store.write("reports", v.name, renderAdvisories(report), "md");
    process.stdout.write(
      `${JSON.stringify({
        output,
        checked: report.checked,
        vendorCatalogChecked: report.vendorCatalogChecked ?? 0,
        verifiedTotal: report.verifiedTotal ?? report.checked,
        affectedPackages: report.affectedPackages,
        counts: report.counts,
        notChecked: report.manualLookup.total,
        incomplete: report.incomplete,
        kev: report.sources.kev,
      })}\n`,
    );
    return;
  }
  if (command === "web") {
    const report = await checkWebsite(v.url, { consent: v.authorized });
    store.write("reports", v.name, report);
    const output = store.write("reports", v.name, renderWeb(report), "md");
    process.stdout.write(
      `${JSON.stringify({ output, counts: report.counts, findings: report.findings.map((f) => f.id), requests: report.policy.requests })}\n`,
    );
    return;
  }
  const scope = store.read("scopes", v.scope);
  if (command === "approve") {
    store.write("scopes", v.scope, approve(scope, v.root, v.yes));
    process.stdout.write(
      "Read scope approved. Target execution is unavailable; these files are never sent anywhere by the CLI.\n",
    );
    return;
  }
  if (command === "revoke") {
    store.write("scopes", v.scope, {
      ...scope,
      approved: false,
      approval: null,
    });
    process.stdout.write("Scope revoked.\n");
    return;
  }
  authorized(scope);
  dashboardScope = sha(scope.root);
  if (command === "compare") {
    const before = store.read("reports", v.before);
    const after = store.read("reports", v.after);
    validateReport(before, scope);
    validateReport(after, scope);
    const report = compareReports(before, after);
    store.write("reports", v.name, report);
    const output = store.write("reports", v.name, renderComparison(report), "md");
    process.stdout.write(`${JSON.stringify({ output, added: report.added.length, existing: report.existing.length, noLongerObserved: report.noLongerObserved.length, incomplete: report.incomplete })}\n`);
    return;
  }
  if (command === "sarif") {
    const report = store.read("reports", v.report);
    validateReport(report, scope);
    const output = store.write("reports", v.name, toSarif(report), "sarif");
    process.stdout.write(`${JSON.stringify({ output, findings: report.findings.length })}\n`);
    return;
  }
  if (command === "updates") {
    const plan = reviewUpdates(scope, v.input);
    store.write("reports", v.name, plan);
    const output = store.write("reports", v.name, renderUpdatePlan(plan), "md");
    process.stdout.write(
      `${JSON.stringify({ output, packages: plan.total, updatesReported: plan.updatesReported, stale: plan.stale, network: false, installation: false })}\n`,
    );
    return;
  }
  if (command === "deps") {
    const report = depsInventory(scope, v.input);
    store.write("reports", v.name, report);
    const output = store.write("reports", v.name, renderInventory(report), "md");
    process.stdout.write(`${JSON.stringify({ output, packages: report.total, ecosystem: report.packages[0]?.ecosystem ?? null, network: false })}\n`);
    return;
  }
  if (command === "onboarding") {
    process.stdout.write(`${JSON.stringify(onboarding(scope), null, 2)}\n`);
    return;
  }
  if (command === "summary") {
    const summary = modelSummary(scope, store.read("reports", v.report));
    const output = store.write("reports", v.name, summary);
    process.stdout.write(
      `${JSON.stringify({ output, included: summary.included, omitted: summary.omitted, providerCalled: false })}\n`,
    );
    return;
  }
  if (command === "show") {
    process.stdout.write(
      `${JSON.stringify({ root: scope.root, files: scope.files, expiresAt: scope.expiresAt, mode: scope.mode }, null, 2)}\n`,
    );
    return;
  }
  if (command === "pr-comment") {
    process.stdout.write(
      renderPrComment(scope, store.read("reports", v.retest)),
    );
    return;
  }
  const report =
    command === "review"
      ? review(scope)
      : command === "import"
        ? importScan(scope, v.input, { format: v.format })
        : retest(
            scope,
            store.read("reports", v.before),
            store.read("reports", v.after),
          );
  store.write("reports", v.name, report);
  const output = store.write("reports", v.name, render(report), "md");
  // Deliberately output only a summary. Never stream imported evidence to a model.
  process.stdout.write(
    `${JSON.stringify({ output, findings: report.findings?.length, results: report.results?.map((r) => ({ ruleId: r.ruleId, status: r.status })) })}\n`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await main();
    try {
      if (
        process.argv[2] &&
        ![
          "start",
          "ui",
          "agent",
          "dashboard",
          "scope",
          "approve",
          "show",
          "revoke",
          "onboarding",
          "pr-comment",
        ].includes(process.argv[2]) &&
        !process.exitCode
      ) {
        refreshDashboard();
        if (dashboardScope)
          for (const lang of ["en", "pl"])
            refreshDashboard(lang, dashboardScope);
      }
    } catch {
      /* derived view only */
    }
  } catch (error) {
    const code =
      error instanceof PolicyError
        ? error.code
        : error.message === "INTERACTIVE_TERMINAL_REQUIRED"
          ? "INTERACTIVE_TERMINAL_REQUIRED"
          : error.code === "ENOENT"
            ? "FILE_NOT_FOUND"
            : "INVALID_INPUT_OR_IO";
    process.stderr.write(
      `CDA: ${code}. Operation stopped; do not expand scope automatically.\n`,
    );
    process.exitCode = 1;
  }
}
