/**
 * Data behind the local Command Center panel (`cda ui`). Reads only the trusted `.cda/reports`
 * state of this tools repository. Model traffic goes through providers.callModel with consent.
 */
import fs from "node:fs";
import path from "node:path";
import { collect } from "./visual.mjs";
import {
  callModel,
  systemPrompt,
  buildBrief,
  briefPrompt,
  loadModelConfig,
  validateProvider,
  sanitizeModelMarkdown,
  scrubIdentifiers,
} from "./providers.mjs";
import { fitHistory } from "./chat.mjs";
import { redact } from "./redact.mjs";

const NAME = /^[a-zA-Z0-9_-]{1,64}$/;

/** Stored JSON reports, newest first: [name, report] pairs. Unreadable files are skipped. */
export function readStoredReports(rootDir, limit = 200) {
  const dir = path.join(rootDir, ".cda", "reports");
  if (!fs.existsSync(dir) || fs.lstatSync(dir).isSymbolicLink()) return [];
  const entries = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json") || !NAME.test(file.slice(0, -5))) continue;
    const full = path.join(dir, file);
    try {
      const stat = fs.lstatSync(full);
      if (!stat.isFile()) continue;
      entries.push({ name: file.slice(0, -5), full, at: stat.mtimeMs });
    } catch { /* vanished */ }
  }
  entries.sort((a, b) => b.at - a.at);
  const named = [];
  for (const e of entries.slice(0, limit)) {
    try { named.push([e.name, JSON.parse(fs.readFileSync(e.full, "utf8")), e.at]); } catch { /* skip */ }
  }
  return named;
}

/**
 * A reading aid, not a certification: 100 minus weighted open findings. Null when nothing was checked.
 */
export function postureScore(counts, sources) {
  if (!sources) return null;
  const penalty = (counts.P0 ?? 0) * 30 + (counts.P1 ?? 0) * 12 + (counts.P2 ?? 0) * 4 + (counts.P3 ?? 0);
  return Math.max(0, 100 - Math.min(100, penalty));
}

const clip = (v, n) => redact(String(v ?? ""), n).replace(/[\r\n]+/g, " ").trim().slice(0, n);

/** Everything the Overview, Findings and Reports views show, from stored reports only. */
export function buildOverview(rootDir) {
  const stored = readStoredReports(rootDir);
  const data = collect(stored.map(([name, report]) => [name, report]));
  const confirmed = (data.verified ?? []).filter((v) => v.status === "confirmed_fixed").length;
  return {
    verdict: data.verdict,
    score: postureScore(data.counts, data.sources.length),
    counts: data.counts,
    areas: data.areas,
    total: data.total ?? data.findings.length,
    sources: data.sources.length,
    incomplete: data.incomplete ?? [],
    stats: data.stats ?? {},
    confirmedFixes: confirmed,
    lastUpdate: stored[0] ? new Date(stored[0][2]).toISOString() : null,
    findings: data.findings.slice(0, 300).map((f, i) => ({
      id: `f${i + 1}`,
      priority: f.priority,
      area: f.area,
      title: clip(f.title, 220),
      impact: clip(f.impact, 600),
      evidence: clip(f.evidence, 400),
      fix: clip(f.fix, 800),
      verify: clip(f.verify, 300),
      basis: f.basis === "tool evidence" ? "tool" : "model",
      source: f.source,
      status: f.status ?? "open",
    })),
    limitations: (data.limitations ?? []).slice(0, 6),
  };
}

/**
 * Multi-turn conversation from the panel. The client keeps the history; the server bounds it,
 * attaches a brief only when asked, and returns sanitized text labelled model judgment.
 */
export async function chatWithModel(payload = {}, { rootDir, call = callModel } = {}) {
  if (payload.consent !== true) throw Object.assign(new Error("CONSENT_REQUIRED"), { code: "CONSENT_REQUIRED" });
  const lang = payload.lang === "en" ? "en" : "pl";
  const config = loadModelConfig(rootDir);
  const provider = validateProvider(payload.provider || config.provider || "");
  // A string (even empty) is the operator's explicit choice; only an omitted field falls back to the saved model.
  const model = typeof payload.model === "string" ? payload.model.trim() || null : config.provider === provider ? config.model : null;
  const raw = Array.isArray(payload.messages) ? payload.messages.slice(-30) : [];
  const messages = raw
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content.slice(0, 40000) }));
  if (!messages.length || messages.at(-1).role !== "user") throw Object.assign(new Error("INVALID_MESSAGES"), { code: "INVALID_MESSAGES" });
  const last = messages.at(-1);
  let attached = null;
  if (payload.focus && typeof payload.focus === "object") {
    // One finding the operator clicked: priority, area and scrubbed title/fix only.
    const f = payload.focus;
    const item = {
      priority: ["P0", "P1", "P2", "P3", "IDEA"].includes(f.priority) ? f.priority : "P3",
      area: scrubIdentifiers(clip(f.area, 24)),
      title: scrubIdentifiers(clip(f.title, 200)),
      fixHint: scrubIdentifiers(clip(f.fix, 300)),
    };
    last.content += `\n\n<cda-data>\n${JSON.stringify({ format: "cda.model-brief.v1", trust: "untrusted-observations", findings: [item] })}\n</cda-data>`;
    attached = "finding";
  } else if (payload.attachReports === true) {
    const brief = buildBrief(readStoredReports(rootDir, 20).map(([n, r]) => [n, r]));
    if (!brief.coverage.sources) throw Object.assign(new Error("NO_SUPPORTED_REPORTS"), { code: "NO_SUPPORTED_REPORTS" });
    last.content = briefPrompt(brief, lang, last.content);
    attached = `reports:${brief.included}/${brief.total}`;
  }
  const res = await call({ provider, model, system: systemPrompt(lang), messages: fitHistory(messages), consent: true, rootDir });
  // The client stores this exact, already scrubbed turn so later questions stay grounded in what was approved.
  return { ok: true, provider: res.provider, model: res.model, seconds: Math.round(res.ms / 100) / 10, attached, sentContent: last.content, text: sanitizeModelMarkdown(res.text) };
}
