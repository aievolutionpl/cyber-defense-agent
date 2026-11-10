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
} from "./scope.mjs";
import { review, importScan, retest, render } from "./engine.mjs";
import { onboarding } from "./onboarding.mjs";
import { modelSummary } from "./triage.mjs";
import { welcomeTerminal } from "./welcome.mjs";
import { reviewUpdates, renderUpdatePlan } from "./updates.mjs";
import { markdown } from "./redact.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const store = new StateStore(ROOT);
const help = `Cyber Defense Agent v0.2 — local only, no project execution\n\nnode tools/cda.mjs start\nnode tools/cda.mjs updates --scope <scope> --input <inventory.json> --name <plan>\nnode tools/cda.mjs scope --root <directory> [--allow <file>] [--git-staged] --name <scope>\nnode tools/cda.mjs approve --scope <scope> --root <directory> --yes\nnode tools/cda.mjs show --scope <scope>\nnode tools/cda.mjs onboarding --scope <scope>\nnode tools/cda.mjs summary --scope <scope> --report <report> --name <summary>\nnode tools/cda.mjs review --scope <scope> --name <report>\nnode tools/cda.mjs import --scope <scope> --input <relative.json|relative.sarif> --name <report>\nnode tools/cda.mjs retest --scope <scope> --before <report> --after <report> --name <retest>\nnode tools/cda.mjs pr-comment --scope <scope> --retest <retest>\nnode tools/cda.mjs revoke --scope <scope>\n\nScopes expire after 24 hours. Reports: .cda/reports/<name>.json and .md\nUse only a trusted copy of these tools, outside the reviewed project.\n`;

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
      before: { type: "string" },
      after: { type: "string" },
      retest: { type: "string" },
      "git-staged": { type: "boolean" },
      yes: { type: "boolean" },
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
    start: [],
    scope: ["root", "allow", "git-staged", "name"],
    approve: ["scope", "root", "yes"],
    show: ["scope"],
    onboarding: ["scope"],
    summary: ["scope", "report", "name"],
    review: ["scope", "name"],
    import: ["scope", "input", "name"],
    updates: ["scope", "input", "name"],
    retest: ["scope", "before", "after", "name"],
    "pr-comment": ["scope", "retest"],
    revoke: ["scope"],
  };
  if (
    !permitted[command] ||
    Object.keys(v).some((k) => !permitted[command].includes(k))
  )
    deny("INVALID_ARGUMENTS");
  if (command === "start") {
    await welcomeTerminal();
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
  const scope = store.read("scopes", v.scope);
  if (command === "approve") {
    store.write("scopes", v.scope, approve(scope, v.root, v.yes));
    process.stdout.write(
      "Read scope approved. Network and target execution are unavailable.\n",
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
  if (command === "updates") {
    const plan = reviewUpdates(scope, v.input);
    store.write("reports", v.name, plan);
    const output = store.write("reports", v.name, renderUpdatePlan(plan), "md");
    process.stdout.write(
      `${JSON.stringify({ output, packages: plan.total, updatesReported: plan.updatesReported, stale: plan.stale, network: false, installation: false })}\n`,
    );
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
        ? importScan(scope, v.input)
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
