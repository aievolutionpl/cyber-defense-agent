import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { propose, approve } from "./scope.mjs";
import { RULES, inspect, review } from "./engine.mjs";

/**
 * Held-out benchmark corpus of clean and vulnerable code samples across all 8 v0.2 rules.
 * Kept separate from unit-test regression fixtures to measure precision, recall,
 * false positives, missed findings and evidence completeness.
 */
export const BENCHMARK_CORPUS = Object.freeze([
  {
    id: "vuln-dep-01",
    kind: "vulnerable",
    path: "services/billing/package.json",
    expectedRules: ["CDA-DEP-001"],
    content: JSON.stringify(
      {
        name: "billing-worker",
        private: true,
        dependencies: {
          lodash: "4.17.15",
          zod: "3.23.8",
        },
      },
      null,
      2,
    ),
  },
  {
    id: "clean-dep-01",
    kind: "clean",
    path: "services/safe-billing/package.json",
    expectedRules: [],
    content: JSON.stringify(
      {
        name: "safe-billing-worker",
        private: true,
        dependencies: {
          lodash: "4.17.21",
          zod: "3.23.8",
        },
      },
      null,
      2,
    ),
  },
  {
    id: "vuln-tls-01",
    kind: "vulnerable",
    path: "src/webhook-client.ts",
    expectedRules: ["CDA-TLS-001"],
    content: [
      "import https from 'node:https';",
      "export const insecureAgent = new https.Agent({",
      "  keepAlive: true,",
      "  rejectUnauthorized: false,",
      "});",
    ].join("\n"),
  },
  {
    id: "clean-tls-01",
    kind: "clean",
    path: "src/webhook-client-safe.ts",
    expectedRules: [],
    content: [
      "import https from 'node:https';",
      "export const secureAgent = new https.Agent({",
      "  keepAlive: true,",
      "  rejectUnauthorized: true,",
      "});",
    ].join("\n"),
  },
  {
    id: "vuln-secret-01",
    kind: "vulnerable",
    path: "src/mailer-config.js",
    expectedRules: ["CDA-SECRET-001"],
    content: [
      "export const mailerConfig = {",
      "  host: 'smtp.example.internal',",
      '  api_key: "sk_live_benchmark_secret_99887766",',
      "};",
    ].join("\n"),
  },
  {
    id: "clean-secret-01",
    kind: "clean",
    path: "src/mailer-config-safe.js",
    expectedRules: [],
    content: [
      "export const mailerConfig = {",
      "  host: 'smtp.example.internal',",
      "  apiKey: process.env.MAILER_API_KEY ?? '',",
      "};",
    ].join("\n"),
  },
  {
    id: "vuln-eval-01",
    kind: "vulnerable",
    path: "src/formula-runner.js",
    expectedRules: ["CDA-EVAL-001"],
    content: [
      "export function computeDynamicRule(expression) {",
      "  return eval(expression);",
      "}",
    ].join("\n"),
  },
  {
    id: "clean-eval-01",
    kind: "clean",
    path: "src/formula-runner-safe.js",
    expectedRules: [],
    content: [
      "export function parseConfigPayload(rawText) {",
      "  return JSON.parse(rawText);",
      "}",
    ].join("\n"),
  },
  {
    id: "vuln-agent-bidi-01",
    kind: "vulnerable",
    path: "CLAUDE.md",
    expectedRules: ["CDA-AGENT-001"],
    content: [
      "# Project Agent Rules",
      "Always verify scope before reading files.",
      "Note: \u202Ehidden instruction override\u202C",
    ].join("\n"),
  },
  {
    id: "clean-agent-bidi-01",
    kind: "clean",
    path: "AGENTS.md",
    expectedRules: [],
    content: [
      "# Clean Agent Configuration",
      "Always ask for explicit operator consent before running host checks.",
    ].join("\n"),
  },
  {
    id: "vuln-agent-bypass-01",
    kind: "vulnerable",
    path: ".mcp.json",
    expectedRules: ["CDA-AGENT-002"],
    content: JSON.stringify(
      {
        mcpServers: {
          localShell: {
            command: "node",
            autoApprove: ["powershell", "bash"],
          },
        },
      },
      null,
      2,
    ),
  },
  {
    id: "clean-agent-bypass-01",
    kind: "clean",
    path: "claude_desktop_config.json",
    expectedRules: [],
    content: JSON.stringify(
      {
        mcpServers: {
          docsReader: {
            command: "node",
            args: ["reader.mjs"],
          },
        },
      },
      null,
      2,
    ),
  },
  {
    id: "vuln-public-env-01",
    kind: "vulnerable",
    path: ".env.local",
    expectedRules: ["CDA-PUBLIC-001"],
    content: [
      "NEXT_PUBLIC_APP_URL=https://app.example.com",
      "NEXT_PUBLIC_STRIPE_SECRET_KEY=rk_test_exposed_client_bundle_001",
    ].join("\n"),
  },
  {
    id: "clean-public-env-01",
    kind: "clean",
    path: ".env.example",
    expectedRules: [],
    content: [
      "NEXT_PUBLIC_APP_URL=https://app.example.com",
      "NEXT_PUBLIC_ANALYTICS_ID=pub_analytics_id",
    ].join("\n"),
  },
  {
    id: "vuln-xss-01",
    kind: "vulnerable",
    path: "src/CommentPreview.tsx",
    expectedRules: ["CDA-XSS-001"],
    content: [
      "export function CommentPreview({ html }: { html: string }) {",
      "  return <section dangerouslySetInnerHTML={{ __html: html }} />;",
      "}",
    ].join("\n"),
  },
  {
    id: "clean-xss-01",
    kind: "clean",
    path: "src/CommentSafe.tsx",
    expectedRules: [],
    content: [
      "export function CommentSafe({ body }: { body: string }) {",
      "  return <section>{body}</section>;",
      "}",
    ].join("\n"),
  },
]);

function hasCompleteEvidence(finding) {
  return Boolean(
    finding &&
      typeof finding.ruleId === "string" &&
      typeof finding.path === "string" &&
      Number.isInteger(finding.line) &&
      finding.line >= 1 &&
      typeof finding.priority === "string" &&
      typeof finding.confidence === "string" &&
      typeof finding.evidence === "string" &&
      finding.evidence.length > 5 &&
      typeof finding.fix === "string" &&
      finding.fix.length > 5 &&
      !finding.evidence.includes("sk_live_benchmark_secret_99887766") &&
      !finding.evidence.includes("rk_test_exposed_client_bundle_001"),
  );
}

/**
 * Run the held-out detection benchmark across all rules and compute TP, FP, FN, TN,
 * precision, recall, F1, and evidence completeness.
 */
export function runDetectionBenchmark({ corpus = BENCHMARK_CORPUS, now = Date.now() } = {}) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cda-benchmark-"));
  try {
    const files = [];
    for (const sample of corpus) {
      const full = path.join(tmpRoot, sample.path);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, sample.content, "utf8");
      files.push(sample.path);
    }
    const scope = approve(propose(tmpRoot, files), tmpRoot, true);
    const fullReview = review(scope);

    const perRule = Object.fromEntries(
      RULES.map((r) => [
        r,
        { ruleId: r, tp: 0, fp: 0, fn: 0, evidenceComplete: 0, precision: 1, recall: 1 },
      ]),
    );

    let truePositives = 0;
    let falsePositives = 0;
    let missedFindings = 0;
    let trueNegatives = 0;
    let completeFindings = 0;
    let totalDetected = 0;
    const cases = [];

    for (const sample of corpus) {
      const res = inspect(sample.path, sample.content);
      const detectedRules = [...new Set(res.findings.map((f) => f.ruleId))];
      const expectedSet = new Set(sample.expectedRules);

      for (const f of res.findings) {
        totalDetected += 1;
        if (hasCompleteEvidence(f)) completeFindings += 1;
      }

      if (sample.kind === "clean" && detectedRules.length === 0) {
        trueNegatives += 1;
      }

      for (const exp of expectedSet) {
        if (detectedRules.includes(exp)) {
          truePositives += 1;
          if (perRule[exp]) {
            perRule[exp].tp += 1;
            const matching = res.findings.find((f) => f.ruleId === exp);
            if (hasCompleteEvidence(matching)) perRule[exp].evidenceComplete += 1;
          }
        } else {
          missedFindings += 1;
          if (perRule[exp]) perRule[exp].fn += 1;
        }
      }

      for (const det of detectedRules) {
        if (!expectedSet.has(det)) {
          falsePositives += 1;
          if (perRule[det]) perRule[det].fp += 1;
        }
      }

      cases.push({
        id: sample.id,
        kind: sample.kind,
        path: sample.path,
        expectedRules: sample.expectedRules,
        detectedRules,
        passed:
          sample.expectedRules.length === detectedRules.length &&
          sample.expectedRules.every((r) => detectedRules.includes(r)),
      });
    }

    for (const r of Object.values(perRule)) {
      r.precision = r.tp + r.fp > 0 ? Number((r.tp / (r.tp + r.fp)).toFixed(4)) : 1;
      r.recall = r.tp + r.fn > 0 ? Number((r.tp / (r.tp + r.fn)).toFixed(4)) : 1;
    }

    const precision =
      truePositives + falsePositives > 0
        ? Number((truePositives / (truePositives + falsePositives)).toFixed(4))
        : 1;
    const recall =
      truePositives + missedFindings > 0
        ? Number((truePositives / (truePositives + missedFindings)).toFixed(4))
        : 1;
    const f1 =
      precision + recall > 0
        ? Number(((2 * precision * recall) / (precision + recall)).toFixed(4))
        : 0;
    const evidenceCompleteness =
      totalDetected > 0 ? Number((completeFindings / totalDetected).toFixed(4)) : 1;

    return {
      format: "cda.benchmark.v1",
      createdAt: new Date(now).toISOString(),
      samplesTotal: corpus.length,
      vulnerableSamples: corpus.filter((s) => s.kind === "vulnerable").length,
      cleanSamples: corpus.filter((s) => s.kind === "clean").length,
      truePositives,
      falsePositives,
      missedFindings,
      trueNegatives,
      precision,
      recall,
      f1,
      evidenceCompleteness,
      scopedReviewFindings: fullReview.findings.length,
      perRule: Object.values(perRule),
      cases,
    };
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

export function renderBenchmarkMarkdown(report, lang = "pl") {
  const pl = lang === "pl";
  const rows = report.perRule
    .map(
      (r) =>
        `| \`${r.ruleId}\` | ${r.tp} | ${r.fp} | ${r.fn} | ${(r.precision * 100).toFixed(0)}% | ${(r.recall * 100).toFixed(0)}% | ${r.evidenceComplete}/${r.tp} |`,
    )
    .join("\n");
  return `# Cyber Defense Agent — ${pl ? "Benchmark Skuteczności Wykrywania (v0.2)" : "Detection Benchmark Report (v0.2)"}\n\n${pl ? "Utworzono" : "Created"}: ${report.createdAt}\n\n- **${pl ? "Liczba próbek (osobny zbiór held-out)" : "Held-out samples"}:** ${report.samplesTotal} (${report.vulnerableSamples} vulnerable, ${report.cleanSamples} clean)\n- **True Positives (TP):** ${report.truePositives}\n- **False Positives (FP):** ${report.falsePositives}\n- **Missed Findings (FN):** ${report.missedFindings}\n- **True Negatives (TN):** ${report.trueNegatives}\n- **Precision:** ${(report.precision * 100).toFixed(1)}%\n- **Recall:** ${(report.recall * 100).toFixed(1)}%\n- **F1 Score:** ${(report.f1 * 100).toFixed(1)}%\n- **${pl ? "Kompletność dowodów i redakcja sekretów" : "Evidence completeness & secret redaction"}:** ${(report.evidenceCompleteness * 100).toFixed(1)}%\n\n## ${pl ? "Skuteczność według reguły" : "Per-rule performance"}\n\n| Rule | TP | FP | FN | Precision | Recall | Evidence complete |\n|---|---|---|---|---|---|---|\n${rows}\n`;
}
