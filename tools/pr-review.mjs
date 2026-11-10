#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { approve, deny, MAX_FILES, propose, relativeFile, ScopedReader, sha, StateStore } from "./scope.mjs";
import { review, VERSION } from "./engine.mjs";
import { compareReports, renderComparison, toSarif } from "./comparison.mjs";
import { collect, renderVisual } from "./visual.mjs";

export function readPolicy(trustedRoot, policyFile) {
  const policy = JSON.parse(new ScopedReader(trustedRoot, [policyFile]).read(policyFile));
  if (policy?.version !== 1 || !Array.isArray(policy.files) || !policy.files.length || policy.files.length > MAX_FILES) deny("INVALID_PR_POLICY");
  const files = policy.files.map(relativeFile);
  if (new Set(files).size !== files.length) deny("INVALID_PR_POLICY");
  return files;
}

/** The reviewed base-branch allowlist authorizes reads. Missing files are gaps, never silent fixes. */
export function scanSnapshot(root, files, rootKey) {
  const present = [];
  const skipped = [];
  const reader = new ScopedReader(root, files);
  for (const file of files) {
    try {
      reader.resolve(file);
      present.push(file);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      skipped.push({ path: file, reason: "Approved file absent from this snapshot." });
    }
  }
  const report = present.length ? review(approve(propose(root, present), root, true)) : {
    format: "cda.report.v1", version: VERSION, createdAt: new Date().toISOString(), source: "local-review",
    findings: [], checks: [], skipped: [], limitations: [],
  };
  // Both checked-out snapshots represent the same repository, identified by the trusted workflow.
  report.scope = { rootKey, files };
  report.skipped.push(...skipped);
  report.limitations.push("Only the explicit base-branch file allowlist and four built-in local rules were checked.");
  return report;
}

export function runPrReview({ baseRoot, headRoot, policyFile, asset, consent }) {
  if (consent !== true) deny("PR_REVIEW_APPROVAL_REQUIRED");
  if (typeof asset !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(asset)) deny("INVALID_ASSET");
  const files = readPolicy(baseRoot, policyFile);
  const rootKey = sha(`github:${asset}`);
  const before = scanSnapshot(baseRoot, files, rootKey);
  const after = scanSnapshot(headRoot, files, rootKey);
  return { before, after, comparison: compareReports(before, after) };
}

function main() {
  const { values: v } = parseArgs({ options: {
    "base-root": { type: "string" }, "head-root": { type: "string" }, policy: { type: "string" },
    asset: { type: "string" }, authorized: { type: "boolean" },
  } });
  const result = runPrReview({ baseRoot: v["base-root"], headRoot: v["head-root"], policyFile: v.policy, asset: v.asset, consent: v.authorized });
  const store = new StateStore(v["base-root"]);
  store.write("reports", "pr-before", result.before);
  store.write("reports", "pr-after", result.after);
  store.write("reports", "pr-comparison", result.comparison);
  const summary = renderComparison(result.comparison);
  store.write("reports", "pr-comparison", summary, "md");
  store.write("reports", "pr-after", toSarif(result.after), "sarif");
  store.write("reports", "pr-after", renderVisual(collect([["head", result.after]])), "html");
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  process.stdout.write(JSON.stringify({ added: result.comparison.added.length, existing: result.comparison.existing.length,
    noLongerObserved: result.comparison.noLongerObserved.length, incomplete: result.comparison.incomplete }) + "\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) {
    process.stderr.write(`CDA PR review stopped: ${error.name === "PolicyError" ? error.code : "INVALID_INPUT_OR_IO"}.\n`);
    process.exitCode = 1;
  }
}
