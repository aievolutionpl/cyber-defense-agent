#!/usr/bin/env node
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
import { collectInventory, depsInventory, renderInventory } from "./inventory.mjs";
import { checkAdvisories, renderAdvisories } from "./advisories.mjs";
import { checkWebsite, renderWeb } from "./web.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const store = new StateStore(ROOT);
const help = `Cyber Defense Agent v0.2 — evidence tools for a defensive agent

Guided start (human terminal)
  node tools/cda.mjs start

Files you approve (read-only, exact allowlist, 24 h)
  node tools/cda.mjs scope --root <directory> --allow <file> [--allow <file>] --name <scope>
  node tools/cda.mjs approve --scope <scope> --root <directory> --yes
  node tools/cda.mjs show --scope <scope>
  node tools/cda.mjs onboarding --scope <scope>
  node tools/cda.mjs review --scope <scope> --name <report>
  node tools/cda.mjs import --scope <scope> --input <relative.json|relative.sarif> --name <report>
  node tools/cda.mjs deps --scope <scope> --input <lockfile> --name <inventory>
  node tools/cda.mjs updates --scope <scope> --input <inventory.json> --name <plan>
  node tools/cda.mjs retest --scope <scope> --before <report> --after <report> --name <retest>
  node tools/cda.mjs summary --scope <scope> --report <report> --name <summary>
  node tools/cda.mjs revoke --scope <scope>

This machine (read-only OS queries; needs the user's consent)
  node tools/cda.mjs inventory --name <inventory> --yes

Known vulnerabilities (sends package names + versions to OSV.dev; needs consent)
  node tools/cda.mjs advisories --inventory <inventory> --name <report> --share-package-names

A website you own or are authorized to assess (a few passive GET requests)
  node tools/cda.mjs web --url <https://...> --name <report> --authorized

Reports: .cda/reports/<name>.json and .md. Nothing is installed, changed or executed in a target.
Use only a trusted copy of these tools, outside the reviewed project.
`;

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
      yes: { type: "boolean" },
      url: { type: "string" },
      inventory: { type: "string" },
      authorized: { type: "boolean" },
      "share-package-names": { type: "boolean" },
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
    scope: ["root", "allow", "name"],
    approve: ["scope", "root", "yes"],
    show: ["scope"],
    onboarding: ["scope"],
    summary: ["scope", "report", "name"],
    review: ["scope", "name"],
    import: ["scope", "input", "name"],
    updates: ["scope", "input", "name"],
    deps: ["scope", "input", "name"],
    inventory: ["name", "yes"],
    advisories: ["inventory", "name", "share-package-names"],
    web: ["url", "name", "authorized"],
    retest: ["scope", "before", "after", "name"],
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
    const scope = propose(v.root, v.allow);
    store.write("scopes", v.name, scope);
    process.stdout.write(
      `${JSON.stringify(scope, null, 2)}\nAwaiting explicit approval. No file content read.\n`,
    );
    return;
  }
  if (command === "inventory") {
    const report = collectInventory({ consent: v.yes });
    store.write("reports", v.name, report);
    const output = store.write("reports", v.name, renderInventory(report), "md");
    process.stdout.write(
      `${JSON.stringify({ output, packages: report.total, sources: report.sources, automaticallyCheckable: report.packages.filter((p) => p.ecosystem).length, networkReachablePorts: report.listeners.ports.filter((p) => p.exposure === "network-reachable").map((p) => p.port), network: false })}\n`,
    );
    return;
  }
  if (command === "advisories") {
    const report = await checkAdvisories(store.read("reports", v.inventory), { consent: v["share-package-names"] });
    store.write("reports", v.name, report);
    const output = store.write("reports", v.name, renderAdvisories(report), "md");
    process.stdout.write(
      `${JSON.stringify({ output, checked: report.checked, affectedPackages: report.affectedPackages, counts: report.counts, notChecked: report.manualLookup.total, incomplete: report.incomplete, kev: report.sources.kev })}\n`,
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
