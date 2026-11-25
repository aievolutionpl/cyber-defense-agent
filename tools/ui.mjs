import {
  detectProviders,
  saveModelConfig,
  loadModelConfig,
  callModel,
  systemPrompt,
  buildBrief,
  briefPrompt,
  renderExplanation,
  validateProvider,
} from "./providers.mjs";
import { buildOverview, chatWithModel, readStoredReports } from "./panel-api.mjs";
import { runDoctor } from "./doctor.mjs";
import { createProject, listProjects, setArchived } from "./projects.mjs";
import http from "node:http";
import crypto from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { dashboardSessions, ALLOWED_AGENT_HOSTS, validateAgentHost, resolveAgentBinary, detectAgents, buildAgentBridge, detectAgentAuthError, getAgentSessions, stopAgentSession, launchAgentSession, checkCodexConnection } from "./agent-sessions.mjs";
export { ALLOWED_AGENT_HOSTS, validateAgentHost, resolveAgentBinary, detectAgents, buildAgentBridge, detectAgentAuthError, getAgentSessions, stopAgentSession, launchAgentSession, checkCodexConnection };
import { getGuidedAudit, listGuidedAudits, startGuidedAudit, cancelGuidedAudit, resumeGuidedAudit, approveGuidedAudit } from "./guided-reviews.mjs";
export { getGuidedAudit, listGuidedAudits, startGuidedAudit, cancelGuidedAudit, resumeGuidedAudit, approveGuidedAudit };
import { ROOT, resolveContainedPath } from "./local-paths.mjs";
export { resolveContainedPath };

import { StateStore, scopeDigest } from "./scope.mjs";
import { renderPanel } from "./panel.mjs";
import { createPdf, isPdf } from "./pdf.mjs";
import { reportCatalog, reportBrief, reportSources, createComparison, renameConversation } from "./workbench.mjs";

/**
 * Verify that an HTTP request originates from localhost (127.0.0.1 / localhost)
 * and has a matching Host and Origin header to prevent DNS rebinding and CSRF.
 */
export function verifyLocalRequest(req, port, { token = null, requireToken = false } = {}) {
  const hostHeader = String(req.headers?.host || "").trim().toLowerCase();
  const allowedHosts = new Set([
    `127.0.0.1:${port}`,
    `localhost:${port}`,
  ]);
  if (!hostHeader || !allowedHosts.has(hostHeader)) {
    const err = new Error("INVALID_HOST_HEADER");
    err.code = "INVALID_HOST_HEADER";
    throw err;
  }

  const origin = req.headers?.origin ? String(req.headers.origin).trim().toLowerCase() : "";
  const allowedOrigins = new Set([
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
  ]);
  if (origin && !allowedOrigins.has(origin)) {
    const err = new Error("INVALID_ORIGIN");
    err.code = "INVALID_ORIGIN";
    throw err;
  }

  const referer = req.headers?.referer ? String(req.headers.referer).trim().toLowerCase() : "";
  if (referer) {
    let refererOk = false;
    for (const prefix of allowedOrigins) {
      if (referer === prefix || referer.startsWith(`${prefix}/`)) {
        refererOk = true;
        break;
      }
    }
    if (!refererOk) {
      const err = new Error("INVALID_ORIGIN");
      err.code = "INVALID_ORIGIN";
      throw err;
    }
  }

  if (requireToken) {
    const provided = String(req.headers?.["x-cda-token"] || "");
    const expected = String(token || "");
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      const err = new Error("INVALID_SESSION_TOKEN");
      err.code = "INVALID_SESSION_TOKEN";
      throw err;
    }
  }
  return true;
}

/** List existing reports in .cda/reports/ safely. */
export function listReportsSummary(rootDir = ROOT) {
  const dir = resolveContainedPath(rootDir, ".cda", "reports");
  if (!fs.existsSync(dir)) return [];
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(json|md|html|pdf|sarif)$/i.test(f))
      .map((name) => {
        const stat = fs.statSync(resolveContainedPath(dir, name));
        return {
          name,
          ext: path.extname(name).slice(1),
          size: stat.size,
          updatedAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 40);
  } catch {
    return [];
  }
}

export function runBoundedAction(action, params = {}) {
  const cda = path.join(ROOT, "tools", "cda.mjs");
  const demo = path.join(ROOT, "tools", "demo.mjs");
  const runNode = (script, args = [], timeout = 25000) => {
    const out = execFileSync(process.execPath, [script, ...args], {
      cwd: ROOT,
      encoding: "utf8",
      timeout,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    return out;
  };

  if (action === "demo") {
    const output = runNode(demo, []);
    const dash = runNode(cda, ["dashboard", "--lang", params.lang === "en" ? "en" : "pl"]);
    return { ok: true, action, output: `${output}\n${dash}`.trim() };
  }
  if (action === "inventory") {
    if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
    const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const name = String(params.name || `pc-${stamp}`).replace(/[^a-z0-9-_]/gi, "") || `pc-${stamp}`;
    const output = runNode(cda, ["inventory", "--name", name, "--yes"]);
    return { ok: true, action, reportName: name, output };
  }
  if (action === "advisories") {
    if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
    const inv = String(params.inventory || "pc").replace(/[^a-z0-9-_]/gi, "") || "pc";
    const name = `${inv}-vulns`;
    const output = runNode(cda, ["advisories", "--inventory", inv, "--name", name, "--share-package-names"], 35000);
    return { ok: true, action, reportName: name, output };
  }
  if (action === "web") {
    if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
    const url = String(params.url || "").trim();
    if (!/^https?:\/\//i.test(url)) throw new Error("INVALID_URL");
    const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const name = `site-${stamp}`;
    const output = runNode(cda, ["web", "--url", url, "--name", name, "--authorized"], 25000);
    return { ok: true, action, reportName: name, output };
  }
  if (action === "git-staged") {
    if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
    const targetRoot = params.root ? path.resolve(String(params.root)) : ROOT;
    const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const scopeName = `staged-${stamp}`;
    const scopeOut = runNode(cda, ["scope", "--root", targetRoot, "--git-staged", "--name", scopeName]);
    const proposal = new StateStore(ROOT).read("scopes", scopeName);
    return { ok: true, action, scopeName, proposalDigest: scopeDigest(proposal), output: scopeOut };
  }
  if (action === "review-staged") {
    if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
    const proposal = new StateStore(ROOT).read("scopes", params.scopeName);
    if (params.proposalDigest !== scopeDigest(proposal)) throw new Error("SCOPE_PROPOSAL_CHANGED");
    const reportName = `staged-review-${crypto.randomBytes(6).toString("hex")}`;
    runNode(cda, ["approve", "--scope", params.scopeName, "--root", proposal.root, "--yes", "--proposal", params.proposalDigest]);
    const output = runNode(cda, ["review", "--scope", params.scopeName, "--name", reportName]);
    return { ok: true, action, reportName, output };
  }
  if (action === "dashboard") {
    const lang = params.lang === "en" ? "en" : "pl";
    const output = runNode(cda, ["dashboard", "--lang", lang]);
    return { ok: true, action, output };
  }
  throw new Error("UNSUPPORTED_ACTION");
}

const pdfExports = new Map();

/** Print a bounded local report snapshot only after explicit browser-process consent. */
export async function exportReportPdf(params, { rootDir = ROOT, pdfCreator = createPdf } = {}) {
  if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
  if (typeof params.report !== "string" || !/^[a-zA-Z0-9_-]{1,100}\.html$/.test(params.report)) throw new Error("INVALID_REPORT_NAME");
  const directory = resolveContainedPath(rootDir, ".cda", "reports");
  const source = resolveContainedPath(directory, params.report);
  const descriptor = fs.openSync(source, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  let bytes;
  try {
    const before = fs.fstatSync(descriptor);
    if (!before.isFile() || before.nlink > 1 || before.size > 8 * 1024 * 1024) throw new Error("INVALID_REPORT_FILE");
    bytes = fs.readFileSync(descriptor);
    const after = fs.lstatSync(resolveContainedPath(directory, params.report));
    if (before.ino !== after.ino || before.dev !== after.dev || before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error("REPORT_CHANGED_DURING_READ");
  } finally { fs.closeSync(descriptor); }
  const html = bytes.toString("utf8");
  if (!html.startsWith("<!doctype html>") || !html.includes("<head>") || !html.includes("default-src 'none'") || !html.includes("Cyber Defense Agent")) throw new Error("INVALID_REPORT_FILE");
  const digest = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const name = `${params.report.slice(0, -5)}-pdf-${digest}.pdf`;
  const destination = resolveContainedPath(directory, name);
  if (fs.existsSync(destination)) {
    const cached = fs.readFileSync(destination);
    if (!isPdf(cached)) throw new Error("PDF_PRINT_FAILED");
    return { ok: true, name, bytes: cached.length };
  }
  if (pdfExports.has(destination)) return pdfExports.get(destination);
  if (pdfExports.size >= 2) throw new Error("PDF_EXPORT_BUSY");
  const job = Promise.resolve().then(() => pdfCreator(html, destination)).then(result => ({ ok: true, name, bytes: result.bytes })).finally(() => pdfExports.delete(destination));
  pdfExports.set(destination, job);
  return job;
}

const PANEL_ASSETS = new Set(["glass.css", "panel.css", "panel.js", "projects.js", "globe.js", "vendor/ui-generation.js", "vendor/text-image-generation.js", "vendor/ui-generation.css", "vendor/text-image-generation.css"]);

export async function explainReportsWithModel(payload = {}, { rootDir = ROOT, call = callModel } = {}) {
  if (payload.consent !== true) throw Object.assign(new Error("CONSENT_REQUIRED"), { code: "CONSENT_REQUIRED" });
  const lang = payload.lang === "en" ? "en" : "pl";
  const config = loadModelConfig(rootDir);
  const provider = validateProvider(payload.provider || config.provider || "");
  // A string (even empty) is the operator's explicit choice; only an omitted field falls back to the saved model.
  const model = typeof payload.model === "string" ? payload.model.trim() || null : config.provider === provider ? config.model : null;
  const requested = Array.isArray(payload.reports) ? payload.reports.filter((n) => typeof n === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(n)) : [];
  // Reads go through StateStore (no symlinked or hard-linked state). Without an explicit selection,
  // explain the 20 most recently written reports and say how many were left out.
  const available = readStoredReports(rootDir, 500, requested.length ? requested : null);
  const named = available.slice(0, 20).map(([n, r]) => [n, r]);
  const names = named.map(([n]) => n);
  const excludedReports = available.length - named.length;
  const brief = buildBrief(named);
  if (!brief.coverage.sources) throw Object.assign(new Error("NO_SUPPORTED_REPORTS"), { code: "NO_SUPPORTED_REPORTS" });
  const question = String(payload.question || "").slice(0, 800);
  const res = await call({ provider, model, system: systemPrompt(lang), messages: [{ role: "user", content: briefPrompt(brief, lang, question) }], consent: true, rootDir });
  const md = renderExplanation({ provider: res.provider, model: res.model, text: res.text, brief, sources: names, lang, question });
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  // StateStore.write refuses linked targets and ancestors and replaces the file atomically.
  const file = new StateStore(rootDir).write("reports", `explain-${stamp}`, md, "md");
  return { ok: true, provider: res.provider, model: res.model, findingsSent: brief.included, findingsTotal: brief.total, reportsUsed: names, excludedReports, rawEvidenceSent: false, report: path.basename(file), text: md };
}

const PANEL_DIR = path.join(ROOT, "tools", "panel");
const PANEL_FILES = Object.freeze({
  "/panel.css": ["panel.css", "text/css; charset=utf-8"],
  "/panel.js": ["panel.js", "text/javascript; charset=utf-8"],
  "/panel-icon.svg": [null, "image/svg+xml"],
});
const PANEL_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0b1310"/><path d="M12 3.5 5.5 6v5c0 4.2 2.8 7.8 6.5 9 3.7-1.2 6.5-4.8 6.5-9V6L12 3.5Z" fill="none" stroke="#5eead4" stroke-width="1.6"/><path d="m9 12 2 2 4-4" fill="none" stroke="#5eead4" stroke-width="1.6" stroke-linecap="round"/></svg>`;
/** Strict policy: only this origin's own script and style files, no inline code, no framing. */
const PANEL_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function renderMiniUiHtml(token, initialLang = "pl") {
  const html = fs.readFileSync(path.join(PANEL_DIR, "index.html"), "utf8");
  return html
    .replace("__CDA_TOKEN__", String(token).replace(/[^a-f0-9]/gi, ""))
    .replaceAll("__CDA_LANG__", initialLang === "en" ? "en" : "pl");
}

/** Start the local Mini Interface server on 127.0.0.1. */
export async function startMiniUi({ port = 3109, lang = "pl", openBrowser = true, rootDir = ROOT, agentsMap = null, pdfCreator = createPdf } = {}) {
  const token = crypto.randomBytes(24).toString("hex");
  let agents = agentsMap;
  const getAgents = () => agents ||= detectAgents();
  const server = http.createServer(async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("Content-Security-Policy", PANEL_CSP);
      const actualPort = server.address()?.port || port;
      verifyLocalRequest(req, actualPort, {
        token,
        requireToken: req.method === "POST",
      });

      const url = new URL(req.url || "/", `http://127.0.0.1:${actualPort}`);
      const secure = { "Cache-Control": "no-store", "Content-Security-Policy": PANEL_CSP, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
      if (req.method === "GET" && url.pathname.startsWith("/assets/")) {
        const asset = url.pathname.slice("/assets/".length);
        if (!PANEL_ASSETS.has(asset)) throw new Error("PATH_OUTSIDE_BOUNDARY");
        const file = resolveContainedPath(ROOT, "tools", "workspace-panel", asset);
        res.writeHead(200, { "Content-Type": asset.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8" });
        res.end(fs.readFileSync(file));
        return;
      }
      if (req.method === "GET" && url.pathname === "/workspace") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        res.end(renderPanel(token, url.searchParams.get("lang") === "en" ? "en" : url.searchParams.get("lang") === "pl" ? "pl" : lang));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/project-history") {
        const id = url.searchParams.get("id") || null;
        const runs = listGuidedAudits(rootDir, Infinity).filter(run => (run.projectId || null) === id)
          .map(({ runId, workflow, status, target, createdAt, reports }) => ({ runId, workflow, status, target, createdAt, reports }));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ runs }));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/review") {
        const run = getGuidedAudit(url.searchParams.get("id"), rootDir);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ run }));
        return;
      }
      if (req.method === "GET" && url.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...secure });
        res.end(renderMiniUiHtml(token, url.searchParams.get("lang") ?? lang));
        return;
      }
      if (req.method === "GET" && Object.hasOwn(PANEL_FILES, url.pathname)) {
        const [file, type] = PANEL_FILES[url.pathname];
        res.writeHead(200, { "Content-Type": type, ...secure });
        res.end(file ? fs.readFileSync(path.join(PANEL_DIR, file)) : PANEL_ICON);
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/overview") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        res.end(JSON.stringify(buildOverview(rootDir)));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/doctor") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        res.end(JSON.stringify(runDoctor({ rootDir })));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/workspace-status") {
        const status = {
          projects: listProjects(rootDir),
          agents: getAgents(),
          reports: listReportsSummary(rootDir),
          runs: listGuidedAudits(rootDir),
          sessions: dashboardSessions(rootDir, url.searchParams.get("session")),
        };
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(status));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/report-catalog') {
        let reports = reportCatalog(rootDir);
        if (url.searchParams.has("project")) {
          const project = url.searchParams.get("project") || null;
          const ids = listGuidedAudits(rootDir, Infinity).filter(run => (run.projectId || null) === project).map(run => run.runId + "-");
          reports = reports.filter(report => ids.some(prefix => report.name.startsWith(prefix)));
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ reports }));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/status") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            agents: getAgents(),
            reports: listReportsSummary(rootDir),
            runs: listGuidedAudits(rootDir),
            sessions: getAgentSessions(rootDir),
          }),
        );
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/bridge") {
        const reqHost = url.searchParams.get("host") || "claude";
        validateAgentHost(reqHost);
        const agents = getAgents();
        const bridge = buildAgentBridge({
          host: reqHost,
          mission: url.searchParams.get("mission") || "demo",
          target: url.searchParams.get("target") || "",
          lang: url.searchParams.get("lang") || lang,
          executablePath: agents[reqHost]?.commandPath || reqHost,
          executableArgs: agents[reqHost]?.commandArgs || [],
        });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(bridge));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/providers") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(detectProviders({ rootDir })));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/workflows") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, runs: listGuidedAudits(rootDir) }));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/agent-sessions") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, sessions: getAgentSessions(rootDir) }));
        return;
      }
      if (req.method === "GET" && url.pathname.startsWith("/report/")) {
        const rawSegment = decodeURIComponent(url.pathname.slice("/report/".length));
        let filePath;
        try {
          filePath = resolveContainedPath(rootDir, ".cda", "reports", rawSegment);
        } catch (error) {
          if (error.code !== "STATE_LINK_BLOCKED") throw error;
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Report not found. Run Demo or Guided Audit first.");
          return;
        }
        const stat = fs.existsSync(filePath) ? fs.lstatSync(filePath) : null;
        if (!stat || !stat.isFile() || stat.nlink > 1) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Report not found. Run Demo or Guided Audit first.");
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const types = {
          ".html": "text/html; charset=utf-8",
          ".md": "text/plain; charset=utf-8",
          ".json": "application/json; charset=utf-8",
          ".pdf": "application/pdf",
        };
        const descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
        try {
          const before = fs.fstatSync(descriptor);
          if (before.nlink > 1 || before.size > 8 * 1024 * 1024) throw new Error("INVALID_REPORT_FILE");
          const content = fs.readFileSync(descriptor);
          const checkedPath = resolveContainedPath(resolveContainedPath(rootDir, ".cda", "reports"), rawSegment);
          const current = fs.lstatSync(checkedPath);
          if (current.dev !== before.dev || current.ino !== before.ino || current.mtimeMs !== before.mtimeMs || current.size !== before.size) throw new Error("REPORT_CHANGED_DURING_READ");
          if (ext === ".pdf" && url.searchParams.get("download") === "1") {
            res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(path.basename(filePath))}"`);
          }
          res.writeHead(200, {
            "Content-Type": types[ext] || "text/plain; charset=utf-8",
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; frame-ancestors 'none'",
          });
          res.end(content);
        } finally {
          fs.closeSync(descriptor);
        }
        return;
      }
      if (req.method === "POST") {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > (url.pathname === "/api/model/chat" ? 131072 : 16384)) throw new Error("PAYLOAD_TOO_LARGE");
        }
        const payload = JSON.parse(body || "{}");
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("INVALID_PAYLOAD");

        if (url.pathname === "/api/reports/pdf") {
          const result = await exportReportPdf(payload, { rootDir, pdfCreator });
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify(result));
          return;
        }
        if (url.pathname === '/api/report-brief') {
          const result = reportBrief(rootDir, payload.name);
          res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result)); return;
        }
        if (url.pathname === '/api/report-sources') {
          res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({reports:reportSources(rootDir,payload.name)})); return;
        }
        if (url.pathname === '/api/compare') {
          const result = createComparison(rootDir, payload);
          res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result)); return;
        }
        if (url.pathname === '/api/conversations/rename') {
          res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(renameConversation(rootDir, payload))); return;
        }
        if (url.pathname === '/api/codex/check') {
          if (payload.consent !== true) throw new Error('CONSENT_REQUIRED');
          if (!agentsMap) agents = detectAgents();
          const result = await checkCodexConnection(getAgents().codex, payload);
          res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result)); return;
        }

        if (url.pathname === "/api/projects" || url.pathname === "/api/conversations/archive") {
          let result = { ok: true };
          if (url.pathname === "/api/projects") result.project = createProject(rootDir, payload.name);
          else setArchived(rootDir, payload);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
          return;
        }
        if (url.pathname === "/api/launch-agent") {
          const result = launchAgentSession(payload, { rootDir, agentsMap: getAgents() });
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify(result));
          return;
        }
        if (url.pathname === "/api/agent-sessions/stop") {
          const session = stopAgentSession(payload.sessionId, rootDir);
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, session }));
          return;
        }
        if (url.pathname === "/api/workflows/start") {
          if (payload.workflow === "project" && (typeof payload.target !== "string" || !payload.target.trim() || !Array.isArray(payload.files) || !payload.files.length || payload.files.some(f => typeof f !== "string" || !f.trim()))) {
            throw new Error("EXACT_FILE_SCOPE_REQUIRED");
          }
          const run = await startGuidedAudit(payload, {
            rootDir,
            awaitCompletion: payload.awaitCompletion === true,
          });
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, run }));
          return;
        }
        if (url.pathname === "/api/workflows/cancel") {
          const run = cancelGuidedAudit(payload.runId, { rootDir });
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, run }));
          return;
        }
        if (url.pathname === "/api/workflows/resume") {
          const run = await resumeGuidedAudit(payload.runId, {
            rootDir,
            awaitCompletion: payload.awaitCompletion === true,
          });
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, run }));
          return;
        }
        if (url.pathname === "/api/workflows/approve") {
          const run = await approveGuidedAudit(payload.runId, { rootDir, approvalToken: payload.approvalToken });
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, run }));
          return;
        }
        if (url.pathname === "/api/model/config") {
          const config = saveModelConfig({ provider: payload.provider, model: payload.model || null, lang: payload.lang }, rootDir);
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, config }));
          return;
        }
        if (url.pathname === "/api/model/chat") {
          const result = await chatWithModel(payload, { rootDir });
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify(result));
          return;
        }
        if (url.pathname === "/api/model/explain") {
          const result = await explainReportsWithModel(payload, { rootDir });
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify(result));
          return;
        }
        if (url.pathname === "/api/run") {
          const result = runBoundedAction(payload.action, payload);
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify(result));
          return;
        }
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    } catch (error) {
      const code = error.code || error.message || "ACTION_FAILED";
      const status =
        code === "INVALID_HOST_HEADER" ||
        code === "INVALID_ORIGIN" ||
        code === "INVALID_SESSION_TOKEN" ||
        code === "PATH_OUTSIDE_BOUNDARY" ||
        code === "INVALID_AGENT_HOST" ||
        code === "CONSENT_REQUIRED" ||
        code === "STATE_LINK_BLOCKED"
          ? 403
          : 400;
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: code, ...(error.detail ? { detail: String(error.detail).slice(0, 200) } : {}) }));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  const actualPort = server.address()?.port || port;
  const url = `http://127.0.0.1:${actualPort}/`;
  if (openBrowser && process.platform === "win32") {
    try {
      const child = spawn("cmd.exe", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true });
      child.unref();
    } catch { /* ignore browser open failure */ }
  }
  return { server, url, port: actualPort, token };
}
