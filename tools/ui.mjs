import http from "node:http";
import crypto from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
import { StateStore } from "./scope.mjs";
import { writeStateFile, readStateFile, ensureRealDir } from "./safe-write.mjs";
import { runDoctor } from "./doctor.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Strictly allowlisted AI agent hosts. Prevents path injection or arbitrary command lookup. */
export const ALLOWED_AGENT_HOSTS = Object.freeze(["claude", "codex", "hermes"]);

/** Validate agent host identifier against the strict allowlist. */
export function validateAgentHost(host) {
  if (typeof host !== "string" || !ALLOWED_AGENT_HOSTS.includes(host)) {
    const err = new Error("INVALID_AGENT_HOST");
    err.code = "INVALID_AGENT_HOST";
    throw err;
  }
  return host;
}

/**
 * Resolve a path strictly inside baseDir. Rejects traversal (..), null bytes, drive prefixes,
 * or any resolved target that escapes baseDir.
 */
export function resolveContainedPath(baseDir, ...segments) {
  if (typeof baseDir !== "string" || !baseDir) {
    const err = new Error("PATH_OUTSIDE_BOUNDARY");
    err.code = "PATH_OUTSIDE_BOUNDARY";
    throw err;
  }
  for (const seg of segments) {
    if (
      typeof seg !== "string" ||
      !seg ||
      seg.includes("\0") ||
      seg.includes("..") ||
      seg.includes(":") ||
      seg.startsWith("/") ||
      seg.startsWith("\\")
    ) {
      const err = new Error("PATH_OUTSIDE_BOUNDARY");
      err.code = "PATH_OUTSIDE_BOUNDARY";
      throw err;
    }
  }
  const baseResolved = path.resolve(baseDir);
  const targetResolved = path.resolve(baseResolved, ...segments);
  const rel = path.relative(baseResolved, targetResolved);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    const err = new Error("PATH_OUTSIDE_BOUNDARY");
    err.code = "PATH_OUTSIDE_BOUNDARY";
    throw err;
  }
  return targetResolved;
}

/**
 * Verify that an HTTP request originates from localhost (127.0.0.1 / localhost)
 * and has a matching Host and Origin header to prevent DNS rebinding and CSRF.
 */
export function verifyLocalRequest(req, port, { token = null, requireToken = false } = {}) {
  const hostHeader = String(req.headers?.host || "").trim().toLowerCase();
  const allowedHosts = new Set([
    `127.0.0.1:${port}`,
    `localhost:${port}`,
    "127.0.0.1",
    "localhost",
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
    "http://127.0.0.1",
    "http://localhost",
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

/**
 * Unified binary resolution across Node and PowerShell/cmd on Windows, macOS, and Linux.
 * Discovers all matching binaries on PATH, picks the canonical executable (.cmd / .exe on Windows),
 * probes its version, and flags when multiple shadowed versions exist on the machine.
 */
export function resolveAgentBinary(host, { execSyncImpl = execFileSync, platform = process.platform } = {}) {
  validateAgentHost(host);
  const candidates = [];
  if (platform === "win32") {
    try {
      const out = execSyncImpl("where.exe", [host], {
        encoding: "utf8",
        timeout: 2000,
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
      });
      for (const line of String(out).split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed) candidates.push(trimmed);
      }
    } catch {
      /* where.exe found nothing */
    }
  } else {
    try {
      const out = execSyncImpl("which", ["-a", host], {
        encoding: "utf8",
        timeout: 2000,
        stdio: ["ignore", "pipe", "ignore"],
      });
      for (const line of String(out).split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed) candidates.push(trimmed);
      }
    } catch {
      /* which found nothing */
    }
  }

  // Prefer .cmd or .exe on Windows so Node and PowerShell invoke the exact same shim/binary
  const ordered = [...candidates].sort((a, b) => {
    const rank = (p) => (/\.exe$/i.test(p) ? 0 : /\.cmd$/i.test(p) ? 1 : /\.bat$/i.test(p) ? 2 : 3);
    return rank(a) - rank(b);
  });

  const probeList = ordered.length
    ? ordered
    : platform === "win32"
      ? [`${host}.cmd`, `${host}.exe`, host]
      : [host];

  const versionByPath = [];
  let chosen = null;

  for (const bin of probeList) {
    try {
      const out = execSyncImpl(bin, ["--version"], {
        encoding: "utf8",
        timeout: 2500,
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
      }).trim();
      const ver = out.split(/\r?\n/)[0]?.slice(0, 80) || "detected";
      versionByPath.push({ path: bin, version: ver });
      if (!chosen) chosen = { executablePath: bin, version: ver };
    } catch {
      /* candidate failed */
    }
  }

  const distinctVersions = [...new Set(versionByPath.map((v) => v.version))];
  return {
    installed: Boolean(chosen),
    executablePath: chosen ? chosen.executablePath : host,
    version: chosen ? chosen.version : null,
    candidates: versionByPath,
    multipleVersions: distinctVersions.length > 1,
    versionWarning:
      distinctVersions.length > 1
        ? `Multiple ${host} versions found in PATH (${versionByPath.map((v) => `${v.path} -> ${v.version}`).join("; ")}). Using ${chosen.executablePath}.`
        : null,
  };
}

/** Safely detect installed AI agent CLIs without shell interpolation. */
export function detectAgents(options = {}) {
  const claude = resolveAgentBinary("claude", options);
  const codex = resolveAgentBinary("codex", options);
  const hermes = resolveAgentBinary("hermes", options);

  return {
    claude: {
      name: "Claude Code CLI",
      command: "claude",
      entry: ".claude/skills/cyber-defense/SKILL.md",
      entryExists: fs.existsSync(path.join(ROOT, ".claude/skills/cyber-defense/SKILL.md")),
      ...claude,
    },
    codex: {
      name: "OpenAI Codex CLI",
      command: "codex",
      entry: ".agents/skills/cyber-defense/SKILL.md",
      entryExists: fs.existsSync(path.join(ROOT, ".agents/skills/cyber-defense/SKILL.md")),
      ...codex,
    },
    hermes: {
      name: "Hermes Agent",
      command: "hermes",
      entry: ".hermes/skills/cyber-defense/SKILL.md",
      entryExists: fs.existsSync(path.join(ROOT, ".hermes/skills/cyber-defense/SKILL.md")),
      ...hermes,
    },
  };
}

/** Build structured prompts and CLI invocations for Claude Code, Codex and Hermes. */
export function buildAgentBridge({ host = "claude", mission = "demo", target = "", lang = "pl", executablePath = null } = {}) {
  const safeHost = validateAgentHost(typeof host === "string" ? host.toLowerCase() : "");
  const pl = lang === "pl";
  const cleanTarget = String(target || "").replace(/[\r\n"`$]/g, "").trim().slice(0, 200);
  const prefix = safeHost === "codex" ? "$cyber-defense" : "/cyber-defense";

  const missions = {
    demo: {
      title: pl ? "Szybkie Demo End-to-End" : "Quick End-to-End Demo",
      prompt: pl
        ? `${prefix} Uruchom lokalne demo (node tools/demo.mjs), przeanalizuj wygenerowane raporty w .cda/reports/ i podsumuj po polsku wykrytą lukę lodash, zablokowany plik poza zakresem oraz wynik retestu.`
        : `${prefix} Run the bundled demo (node tools/demo.mjs), inspect .cda/reports/, and summarize the lodash finding, blocked out-of-scope read, and retest verification.`,
    },
    code: {
      title: pl ? "Audyt Kodu i Zależności" : "Code & Dependency Audit",
      prompt: pl
        ? `${prefix} Przeprowadź przegląd bezpieczeństwa projektu${cleanTarget ? ` w katalogu "${cleanTarget}"` : ""}. Najpierw zaproponuj dokładny zakres plików (scope) i poczekaj na moją zgodę (approve --yes), a następnie sprawdź zależności i 8 reguł lokalnych v0.2.`
        : `${prefix} Conduct a security review of the project${cleanTarget ? ` at "${cleanTarget}"` : ""}. Propose an exact file allowlist (scope) and wait for my approval before running local rules and dependency checks.`,
    },
    pc: {
      title: pl ? "Audyt Komputera i Luk CVE" : "Computer & CVE Audit",
      prompt: pl
        ? `${prefix} Sprawdź ten komputer pod kątem zainstalowanych programów, otwartych portów oraz znanych luk w OSV.dev, CISA KEV i katalogu producentów Windows. Przed każdym krokiem zapytaj mnie o zgodę na użycie flag --yes oraz --share-package-names.`
        : `${prefix} Check this machine for installed software, open ports, and known vulnerabilities in OSV.dev, CISA KEV and Windows vendor catalog. Ask for my consent before using --yes and --share-package-names.`,
    },
    web: {
      title: pl ? "Pasywny Audyt Strony WWW" : "Passive Website Audit",
      prompt: pl
        ? `${prefix} Sprawdź pasywnie zabezpieczenia mojej strony WWW${cleanTarget ? ` (${cleanTarget})` : " (<podaj-url>)"}: HTTPS, HSTS, CSP, flagi cookies, CORS oraz certyfikat TLS po moim potwierdzeniu uprawnień (--authorized).`
        : `${prefix} Passively check the security posture of my website${cleanTarget ? ` (${cleanTarget})` : " (<your-url>)"}: HTTPS, HSTS, CSP, cookies, CORS and TLS certificate after my authorization (--authorized).`,
    },
    report: {
      title: pl ? "Raport Wizualny HTML / PDF" : "Visual HTML / PDF Report",
      prompt: pl
        ? `${prefix} Zbierz dotychczasowe ustalenia i wygeneruj wizualny raport po polsku (node tools/cda.mjs report --lang pl) oraz odśwież panel dashboard.html.`
        : `${prefix} Collect current findings and generate a visual report (node tools/cda.mjs report --lang en) and refresh dashboard.html.`,
    },
  };

  const selectedKey = Object.hasOwn(missions, mission) ? mission : "demo";
  const selected = missions[selectedKey];
  const bin = safeHost === "codex" ? "codex" : safeHost === "hermes" ? "hermes" : "claude";
  const resolvedBin = executablePath || bin;
  const quotedBin = resolvedBin.includes(" ") ? `"${resolvedBin}"` : resolvedBin;
  const cliCommand = `${quotedBin} "${selected.prompt.replace(/"/g, '\\"')}"`;

  return {
    host: safeHost,
    bin,
    executablePath: resolvedBin,
    mission: selectedKey,
    title: selected.title,
    prompt: selected.prompt,
    cliCommand,
    interactiveCommand: quotedBin,
  };
}

/** Detect common CLI authentication / login errors from stdout/stderr. */
export function detectAgentAuthError(text, host = "claude", lang = "pl") {
  const raw = String(text || "");
  if (
    /not logged in|please run .*login|authentication failed|unauthorized|invalid api key|missing api key|401|anthropic_api_key|openai_api_key|login required|token expired/i.test(
      raw,
    )
  ) {
    const loginCmd = host === "codex" ? "codex login" : host === "claude" ? "claude login" : `${host} login`;
    return {
      isAuthError: true,
      hint:
        lang === "en"
          ? `Authentication required for ${host}. Run "${loginCmd}" in your terminal or configure the API key, then retry.`
          : `Wymagane logowanie dla ${host}. Uruchom "${loginCmd}" w terminalu lub skonfiguruj klucz API, a następnie ponów próbę.`,
    };
  }
  return { isAuthError: false, hint: null };
}

const activeAgentProcesses = new Map();

function sessionsDir(rootDir = ROOT) {
  return ensureRealDir(rootDir, resolveContainedPath(rootDir, ".cda", "sessions"));
}

function saveSessionState(session, rootDir = ROOT) {
  const dir = sessionsDir(rootDir);
  const file = resolveContainedPath(dir, `${session.sessionId}.json`);
  writeStateFile(rootDir, file, JSON.stringify(session, null, 2));
  return session;
}

/** List tracked agent CLI sessions (newest first). */
export function getAgentSessions(rootDir = ROOT) {
  const dir = path.join(rootDir, ".cda", "sessions");
  if (!fs.existsSync(dir)) return [];
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          return JSON.parse(readStateFile(rootDir, resolveContainedPath(dir, f)));
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => String(b.startedAt || "").localeCompare(String(a.startedAt || "")))
      .slice(0, 20);
  } catch {
    return [];
  }
}

/** Stop an active agent session by sessionId. */
export function stopAgentSession(sessionId, rootDir = ROOT) {
  const cleanId = String(sessionId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleanId) throw new Error("INVALID_SESSION_ID");
  const dir = sessionsDir(rootDir);
  const file = resolveContainedPath(dir, `${cleanId}.json`);
  if (!fs.existsSync(file)) throw new Error("SESSION_NOT_FOUND");
  const session = JSON.parse(readStateFile(rootDir, file));
  const proc = activeAgentProcesses.get(cleanId);
  if (proc) {
    try {
      proc.kill("SIGTERM");
    } catch {
      /* process already exited */
    }
    activeAgentProcesses.delete(cleanId);
  }
  session.status = "cancelled";
  session.endedAt = new Date().toISOString();
  return saveSessionState(session, rootDir);
}

/**
 * Launch an AI agent session with the selected mission prompt, unified executable path,
 * live session state tracking, and login/error diagnostics.
 */
export function launchAgentSession(
  payload = {},
  {
    rootDir = ROOT,
    agentsMap = null,
    spawnImpl = spawn,
    openTerminalWindow = process.platform === "win32",
  } = {},
) {
  const rawHost = payload.host === undefined ? "claude" : payload.host;
  const safeHost = validateAgentHost(typeof rawHost === "string" ? rawHost.toLowerCase() : "");
  const lang = payload.lang === "en" ? "en" : "pl";
  const agents = agentsMap || detectAgents();
  const hostInfo = agents[safeHost] || {
    name: safeHost,
    installed: false,
    executablePath: safeHost,
    version: null,
  };
  const bridge = buildAgentBridge({
    host: safeHost,
    mission: payload.mission || "demo",
    target: payload.target || "",
    lang,
    executablePath: hostInfo.executablePath || safeHost,
  });

  const cdaDir = ensureRealDir(rootDir, resolveContainedPath(rootDir, ".cda"));
  const promptFile = resolveContainedPath(cdaDir, `last-agent-prompt-${safeHost}.txt`);
  writeStateFile(rootDir, promptFile, bridge.prompt);

  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const sessionId = `agent-${safeHost}-${stamp}-${crypto.randomBytes(3).toString("hex")}`;
  const sDir = sessionsDir(rootDir);
  const sessionPromptFile = resolveContainedPath(sDir, `${sessionId}-prompt.txt`);
  writeStateFile(rootDir, sessionPromptFile, bridge.prompt);

  const session = {
    sessionId,
    host: safeHost,
    hostName: hostInfo.name || safeHost,
    mission: bridge.mission,
    title: bridge.title,
    target: String(payload.target || "").slice(0, 200),
    lang,
    executablePath: hostInfo.executablePath || safeHost,
    version: hostInfo.version || null,
    versionWarning: hostInfo.versionWarning || null,
    prompt: bridge.prompt,
    promptFile: `.cda/last-agent-prompt-${safeHost}.txt`,
    cliCommand: bridge.cliCommand,
    status: hostInfo.installed ? "running" : "not_installed",
    startedAt: new Date().toISOString(),
    endedAt: hostInfo.installed ? null : new Date().toISOString(),
    exitCode: null,
    output: "",
    error: hostInfo.installed
      ? null
      : lang === "en"
        ? `${hostInfo.name} binary was not found in PATH. Install it or paste the prompt manually.`
        : `Nie znaleziono programu ${hostInfo.name} w PATH. Zainstaluj CLI lub wklej prompt ręcznie.`,
    authError: false,
    authHint: null,
  };
  saveSessionState(session, rootDir);

  if (!hostInfo.installed) {
    return {
      ok: false,
      session,
      message:
        lang === "en"
          ? `⚠️ ${hostInfo.name} is not installed in PATH.\n✓ Saved mission prompt to ${session.promptFile}\n\nCommand to run once installed:\n${bridge.cliCommand}`
          : `⚠️ Nie wykryto ${hostInfo.name} w PATH.\n✓ Zapisano zadanie w ${session.promptFile}\n\nKomenda do uruchomienia po instalacji:\n${bridge.cliCommand}`,
    };
  }

  try {
    // Non-interactive forms: `claude -p` and `codex exec` (plain `codex <prompt>` opens a TUI that needs a terminal).
    const args = safeHost === "claude" ? ["-p", bridge.prompt] : safeHost === "codex" ? ["exec", "--skip-git-repo-check", bridge.prompt] : [bridge.prompt];
    const useCmdShim = process.platform === "win32" && /\.(cmd|bat)$/i.test(session.executablePath);
    const proc = useCmdShim
      ? spawnImpl("cmd.exe", ["/d", "/s", "/c", session.executablePath, ...args], {
          cwd: rootDir,
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        })
      : spawnImpl(session.executablePath, args, {
          cwd: rootDir,
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        });

    activeAgentProcesses.set(sessionId, proc);

    const appendOutput = (chunk) => {
      session.output = (session.output + String(chunk ?? "")).slice(-12000);
      const auth = detectAgentAuthError(session.output, safeHost, lang);
      if (auth.isAuthError) {
        session.authError = true;
        session.authHint = auth.hint;
        session.status = "auth_error";
      }
      saveSessionState(session, rootDir);
    };

    proc.stdout?.on("data", appendOutput);
    proc.stderr?.on("data", appendOutput);

    proc.on("error", (err) => {
      activeAgentProcesses.delete(sessionId);
      session.status = "failed";
      session.error = err.message || "SPAWN_ERROR";
      session.endedAt = new Date().toISOString();
      saveSessionState(session, rootDir);
    });

    proc.on("close", (code) => {
      activeAgentProcesses.delete(sessionId);
      session.exitCode = code;
      session.endedAt = new Date().toISOString();
      const auth = detectAgentAuthError(session.output, safeHost, lang);
      if (auth.isAuthError) {
        session.authError = true;
        session.authHint = auth.hint;
        session.status = "auth_error";
        session.error = auth.hint;
      } else if (session.status !== "cancelled") {
        session.status = code === 0 ? "completed" : "failed";
        if (code !== 0 && !session.error) {
          session.error =
            lang === "en"
              ? `Process exited with code ${code}.`
              : `Proces zakończył się kodem ${code}.`;
        }
      }
      saveSessionState(session, rootDir);
    });

    if (openTerminalWindow && spawnImpl === spawn && process.platform === "win32") {
      try {
        const winChild = spawn(
          "cmd.exe",
          ["/c", "start", "cmd.exe", "/k", session.executablePath, bridge.prompt],
          { cwd: rootDir, detached: true, stdio: "ignore", windowsHide: true },
        );
        winChild.unref();
      } catch {
        /* ignore window spawn error */
      }
    }
  } catch (err) {
    session.status = "failed";
    session.error = err.message || "LAUNCH_FAILED";
    session.endedAt = new Date().toISOString();
    saveSessionState(session, rootDir);
    return { ok: false, session, message: `❌ ${session.error}` };
  }

  return {
    ok: true,
    session,
    message:
      lang === "en"
        ? `✓ Session ${session.sessionId} started (${session.hostName} · ${session.version || "detected"}).\n✓ Binary: ${session.executablePath}${session.versionWarning ? `\n⚠️ ${session.versionWarning}` : ""}\n✓ Mission passed: ${session.title}\n✓ Prompt saved to ${session.promptFile}`
        : `✓ Uruchomiono sesję ${session.sessionId} (${session.hostName} · ${session.version || "wykryto"}).\n✓ Program: ${session.executablePath}${session.versionWarning ? `\n⚠️ ${session.versionWarning}` : ""}\n✓ Przekazano zadanie: ${session.title}\n✓ Zapisano prompt w ${session.promptFile}`,
  };
}

/** List existing reports in .cda/reports/ safely. */
export function listReportsSummary(rootDir = ROOT) {
  const dir = path.join(rootDir, ".cda", "reports");
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

/* ============================================================================
 * PRIORITY 3: GUIDED MULTI-STEP AUDIT WORKFLOW ENGINE (ASYNC, CANCEL, RESUME)
 * ========================================================================== */

const activeWorkflowChildren = new Map();

function runsDir(rootDir = ROOT) {
  return ensureRealDir(rootDir, resolveContainedPath(rootDir, ".cda", "runs"));
}

function saveRunState(run, rootDir = ROOT) {
  run.updatedAt = new Date().toISOString();
  const dir = runsDir(rootDir);
  const file = resolveContainedPath(dir, `${run.runId}.json`);
  writeStateFile(rootDir, file, JSON.stringify(run, null, 2));
  return run;
}

export function getGuidedAudit(runId, rootDir = ROOT) {
  const cleanId = String(runId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleanId) throw new Error("INVALID_RUN_ID");
  const file = resolveContainedPath(runsDir(rootDir), `${cleanId}.json`);
  if (!fs.existsSync(file)) throw new Error("RUN_NOT_FOUND");
  return JSON.parse(readStateFile(rootDir, file));
}

export function listGuidedAudits(rootDir = ROOT) {
  const dir = path.join(rootDir, ".cda", "runs");
  if (!fs.existsSync(dir)) return [];
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          return JSON.parse(readStateFile(rootDir, resolveContainedPath(dir, f)));
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .slice(0, 25);
  } catch {
    return [];
  }
}

function discoverProjectFiles(targetRoot) {
  const candidates = [
    "package.json",
    "package-lock.json",
    ".env",
    "AGENTS.md",
    "CLAUDE.md",
    "SKILL.md",
    ".mcp.json",
  ];
  const found = [];
  for (const rel of candidates) {
    const full = path.join(targetRoot, rel);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      found.push(rel);
    }
  }
  const scanSubdir = (sub) => {
    const dir = path.join(targetRoot, sub);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
    for (const entry of fs.readdirSync(dir).slice(0, 25)) {
      const rel = path.posix.join(sub, entry);
      const full = path.join(targetRoot, sub, entry);
      if (
        fs.existsSync(full) &&
        fs.statSync(full).isFile() &&
        /\.(?:[cm]?[jt]sx?|py|json|ya?ml|md)$/i.test(entry)
      ) {
        found.push(rel);
      }
    }
  };
  scanSubdir("src");
  scanSubdir("tools");
  return [...new Set(found)].slice(0, 30);
}

function buildWorkflowDefinition(workflow, runId, params = {}) {
  const pl = params.lang !== "en";
  const cda = path.join(ROOT, "tools", "cda.mjs");
  const demo = path.join(ROOT, "tools", "demo.mjs");
  const langArg = pl ? "pl" : "en";

  if (workflow === "pc") {
    if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
    const invName = `${runId}-inventory`;
    const advName = `${runId}-advisories`;
    const repName = `${runId}-report`;
    return {
      title: pl ? "Prowadzony Audyt Komputera (Inwentarz + CVE + Katalog Windows)" : "Guided Computer Audit (Inventory + CVE + Windows Catalog)",
      steps: [
        {
          id: "inventory",
          label: pl ? "1. Inwentaryzacja programów i otwartych portów TCP" : "1. Software & TCP port inventory",
          script: cda,
          args: ["inventory", "--name", invName, "--yes"],
          reportName: `${invName}.json`,
        },
        {
          id: "advisories",
          label: pl ? "2. Weryfikacja luk (OSV.dev, CISA KEV i Katalog Windows)" : "2. Vulnerability check (OSV.dev, CISA KEV & Windows Catalog)",
          script: cda,
          args: ["advisories", "--inventory", invName, "--name", advName, "--share-package-names"],
          reportName: `${advName}.json`,
        },
        {
          id: "report",
          label: pl ? "3. Generowanie raportu wizualnego HTML i Dashboardu" : "3. Visual HTML report & Dashboard generation",
          script: cda,
          args: ["report", "--name", repName, "--from", invName, "--from", advName, "--lang", langArg],
          reportName: `${repName}.html`,
        },
      ],
    };
  }

  if (workflow === "project") {
    if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
    const targetRoot = params.target ? path.resolve(String(params.target)) : ROOT;
    if (!fs.existsSync(targetRoot)) throw new Error("INVALID_TARGET_PATH");
    const files = Array.isArray(params.files) && params.files.length ? params.files : discoverProjectFiles(targetRoot);
    if (!files.length) throw new Error("NO_REVIEWABLE_FILES_FOUND");
    const scopeName = `${runId}-scope`;
    const revName = `${runId}-review`;
    const depsName = `${runId}-deps`;
    const repName = `${runId}-report`;
    const allowArgs = files.flatMap((f) => ["--allow", f]);
    const hasLockfile = files.includes("package-lock.json");

    const steps = [
      {
        id: "scope",
        label: pl ? `1. Propozycja zakresu (${files.length} plików)` : `1. Propose file scope (${files.length} files)`,
        script: cda,
        args: ["scope", "--root", targetRoot, ...allowArgs, "--name", scopeName],
        reportName: null,
      },
      {
        id: "approve",
        label: pl ? "2. Zatwierdzenie zakresu tylko do odczytu (24h)" : "2. Approve read-only scope (24h)",
        script: cda,
        args: ["approve", "--scope", scopeName, "--root", targetRoot, "--yes"],
        reportName: null,
      },
      {
        id: "review",
        label: pl ? "3. Skanowanie regułami statycznymi v0.2" : "3. Static security rules scan v0.2",
        script: cda,
        args: ["review", "--scope", scopeName, "--name", revName],
        reportName: `${revName}.json`,
      },
    ];
    if (hasLockfile) {
      steps.push({
        id: "deps",
        label: pl ? "4. Inwentaryzacja zależności z package-lock.json" : "4. Dependency lockfile inventory",
        script: cda,
        args: ["deps", "--scope", scopeName, "--input", "package-lock.json", "--name", depsName],
        reportName: `${depsName}.json`,
      });
    }
    steps.push({
      id: "report",
      label: pl ? `${hasLockfile ? "5" : "4"}. Generowanie raportu wizualnego HTML` : `${hasLockfile ? "5" : "4"}. Visual HTML report generation`,
      script: cda,
      args: [
        "report",
        "--name",
        repName,
        "--from",
        revName,
        ...(hasLockfile ? ["--from", depsName] : []),
        "--lang",
        langArg,
      ],
      reportName: `${repName}.html`,
    });
    return {
      title: pl ? "Prowadzony Audyt Projektu i Kodu" : "Guided Project & Code Audit",
      steps,
    };
  }

  if (workflow === "web") {
    if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
    const url = String(params.target || params.url || "").trim();
    if (!/^https?:\/\//i.test(url)) throw new Error("INVALID_URL");
    const webName = `${runId}-web`;
    const repName = `${runId}-report`;
    return {
      title: pl ? `Pasywny Audyt Strony WWW (${url})` : `Passive Website Audit (${url})`,
      steps: [
        {
          id: "web",
          label: pl ? "1. Pasywna kontrola HTTPS, HSTS, CSP, Cookies, CORS i TLS" : "1. Passive HTTPS, HSTS, CSP, Cookies, CORS & TLS check",
          script: cda,
          args: ["web", "--url", url, "--name", webName, "--authorized"],
          reportName: `${webName}.json`,
        },
        {
          id: "report",
          label: pl ? "2. Generowanie raportu wizualnego HTML i Dashboardu" : "2. Visual HTML report & Dashboard generation",
          script: cda,
          args: ["report", "--name", repName, "--from", webName, "--lang", langArg],
          reportName: `${repName}.html`,
        },
      ],
    };
  }

  if (workflow === "demo") {
    return {
      title: pl ? "Scenariusz Demo: Wykrycie → Blokada → Poprawka → Retest" : "Demo Walkthrough: Finding → Block → Fix → Retest",
      steps: [
        {
          id: "demo",
          label: pl ? "1. Syntetyczny projekt, wykrycie luki lodash i retest" : "1. Synthetic project, lodash finding and retest",
          script: demo,
          args: [],
          reportName: "demo-report.html",
        },
        {
          id: "dashboard",
          label: pl ? "2. Odświeżenie wspólnego panelu dashboard.html" : "2. Refresh shared dashboard.html",
          script: cda,
          args: ["dashboard", "--lang", langArg],
          reportName: "dashboard.html",
        },
      ],
    };
  }

  throw new Error("UNSUPPORTED_WORKFLOW");
}

function computeNextStepRecommendation(run) {
  const pl = run.lang !== "en";
  if (run.status === "cancelled") {
    return pl
      ? "Audyt został wstrzymany przez operatora. Kliknij „Wznów audyt”, aby dokończyć od przerwanego kroku."
      : "Audit was paused by the operator. Click 'Resume audit' to continue from the interrupted step.";
  }
  if (run.status === "failed") {
    return pl
      ? `Krok zakończył się błędem (${run.error || "sprawdź logi"}). Po rozwiązaniu przyczyny kliknij „Wznów audyt”.`
      : `A step failed (${run.error || "check logs"}). Fix the cause and click 'Resume audit'.`;
  }
  if (run.status === "running") {
    return pl ? "Trwa wykonywanie kroków audytu..." : "Executing guided audit steps...";
  }
  const counts = run.findingsSummary?.counts || { P0: 0, P1: 0, P2: 0, P3: 0 };
  if (counts.P0 > 0 || counts.P1 > 0) {
    return pl
      ? `Wykryto pilne ustalenia (P0: ${counts.P0}, P1: ${counts.P1}). Otwórz wygenerowany raport HTML, wdróż poprawki, a następnie uruchom retest lub przekaż raport do Claude/Codex.`
      : `High-priority findings detected (P0: ${counts.P0}, P1: ${counts.P1}). Open the HTML report, apply fixes, then run a retest or pass the report to Claude/Codex.`;
  }
  return pl
    ? "Audyt zakończony. Przejrzyj raport HTML oraz sekcję pokrycia (programy wymagające sprawdzenia u producenta)."
    : "Audit completed. Review the HTML report and coverage limits (packages needing vendor verification).";
}

async function executeWorkflowSteps(run, { rootDir = ROOT, stepRunner = null } = {}) {
  const defaultRunner = (step, runId) =>
    new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [step.script, ...step.args], {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      activeWorkflowChildren.set(runId, child);
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (d) => {
        stdout += String(d);
      });
      child.stderr?.on("data", (d) => {
        stderr += String(d);
      });
      child.on("error", (err) => {
        activeWorkflowChildren.delete(runId);
        reject(err);
      });
      child.on("close", (code, signal) => {
        activeWorkflowChildren.delete(runId);
        if (signal === "SIGTERM" || signal === "SIGKILL") {
          const cancelErr = new Error("WORKFLOW_CANCELLED");
          cancelErr.code = "WORKFLOW_CANCELLED";
          reject(cancelErr);
          return;
        }
        if (code !== 0) {
          const err = new Error((stderr || stdout || `Step ${step.id} exited with code ${code}`).trim());
          err.code = "STEP_FAILED";
          reject(err);
          return;
        }
        resolve(stdout.trim());
      });
    });

  const runner = stepRunner || defaultRunner;

  for (const step of run.steps) {
    const fresh = getGuidedAudit(run.runId, rootDir);
    if (fresh.status === "cancelled") {
      run.status = "cancelled";
      run.nextStep = computeNextStepRecommendation(run);
      saveRunState(run, rootDir);
      return run;
    }
    if (step.status === "completed") continue;

    step.status = "running";
    step.startedAt = new Date().toISOString();
    step.error = null;
    saveRunState(run, rootDir);

    try {
      const output = await runner(step, run.runId);
      const afterCheck = getGuidedAudit(run.runId, rootDir);
      if (afterCheck.status === "cancelled") {
        step.status = "cancelled";
        step.finishedAt = new Date().toISOString();
        run.status = "cancelled";
        run.nextStep = computeNextStepRecommendation(run);
        saveRunState(run, rootDir);
        return run;
      }
      step.status = "completed";
      step.finishedAt = new Date().toISOString();
      step.output = String(output || "").slice(0, 4000);
      if (step.reportName && !run.reports.includes(step.reportName)) {
        run.reports.push(step.reportName);
      }
      try {
        const parsed = JSON.parse(String(output || "").split(/\r?\n/).at(-1) || "{}");
        if (parsed.counts) {
          run.findingsSummary = {
            verdict: parsed.verdict || "routine",
            counts: parsed.counts,
            checked: parsed.checked,
            notChecked: parsed.notChecked,
          };
        }
      } catch {
        /* non-JSON step output */
      }
      saveRunState(run, rootDir);
    } catch (err) {
      const current = getGuidedAudit(run.runId, rootDir);
      if (current.status === "cancelled" || err.code === "WORKFLOW_CANCELLED") {
        step.status = "cancelled";
        step.finishedAt = new Date().toISOString();
        run.status = "cancelled";
        run.nextStep = computeNextStepRecommendation(run);
        saveRunState(run, rootDir);
        return run;
      }
      step.status = "failed";
      step.finishedAt = new Date().toISOString();
      step.error = err.message || "STEP_FAILED";
      run.status = "failed";
      run.error = step.error;
      run.nextStep = computeNextStepRecommendation(run);
      saveRunState(run, rootDir);
      return run;
    }
  }

  run.status = "completed";
  run.error = null;
  run.finishedAt = new Date().toISOString();
  run.nextStep = computeNextStepRecommendation(run);
  saveRunState(run, rootDir);
  return run;
}

/**
 * Start a guided multi-step audit workflow ("pc", "project", "web", or "demo").
 * Runs asynchronously in the background (or awaits completion when awaitCompletion=true for tests).
 */
export function startGuidedAudit(
  params = {},
  { rootDir = ROOT, stepRunner = null, awaitCompletion = false } = {},
) {
  const workflow = String(params.workflow || "demo").toLowerCase();
  const lang = params.lang === "en" ? "en" : "pl";
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const runId = `run-${workflow}-${stamp}-${crypto.randomBytes(2).toString("hex")}`;
  const def = buildWorkflowDefinition(workflow, runId, { ...params, lang });

  const run = {
    runId,
    workflow,
    title: def.title,
    target: String(params.target || params.url || "").slice(0, 200),
    lang,
    status: "running",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
    steps: def.steps.map((s) => ({
      id: s.id,
      label: s.label,
      script: s.script,
      args: s.args,
      reportName: s.reportName,
      status: "pending",
      startedAt: null,
      finishedAt: null,
      output: "",
      error: null,
    })),
    reports: [],
    findingsSummary: null,
    nextStep: computeNextStepRecommendation({ status: "running", lang }),
  };

  saveRunState(run, rootDir);
  const promise = executeWorkflowSteps(run, { rootDir, stepRunner });
  if (awaitCompletion) return promise;
  return Promise.resolve(run);
}

/** Cancel a running guided audit workflow and record cancellation state. */
export function cancelGuidedAudit(runId, { rootDir = ROOT } = {}) {
  const run = getGuidedAudit(runId, rootDir);
  run.status = "cancelled";
  run.cancelledAt = new Date().toISOString();
  for (const step of run.steps) {
    if (step.status === "running") {
      step.status = "cancelled";
      step.finishedAt = new Date().toISOString();
    }
  }
  run.nextStep = computeNextStepRecommendation(run);
  saveRunState(run, rootDir);

  const child = activeWorkflowChildren.get(run.runId);
  if (child) {
    try {
      child.kill("SIGTERM");
    } catch {
      /* already exited */
    }
    activeWorkflowChildren.delete(run.runId);
  }
  return run;
}

/** Resume a failed or cancelled guided audit from the first unfinished step. */
export function resumeGuidedAudit(
  runId,
  { rootDir = ROOT, stepRunner = null, awaitCompletion = false } = {},
) {
  const run = getGuidedAudit(runId, rootDir);
  if (run.status === "running") return Promise.resolve(run);
  run.status = "running";
  run.error = null;
  for (const step of run.steps) {
    if (step.status === "failed" || step.status === "cancelled") {
      step.status = "pending";
      step.error = null;
    }
  }
  run.nextStep = computeNextStepRecommendation(run);
  saveRunState(run, rootDir);
  const promise = executeWorkflowSteps(run, { rootDir, stepRunner });
  if (awaitCompletion) return promise;
  return Promise.resolve(run);
}

/** Execute a bounded, allowlisted local tool action from the Mini UI or TUI. */
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
    const revName = `staged-review-${stamp}`;
    const scopeOut = runNode(cda, ["scope", "--root", targetRoot, "--git-staged", "--name", scopeName]);
    const approveOut = runNode(cda, ["approve", "--scope", scopeName, "--root", targetRoot, "--yes"]);
    const reviewOut = runNode(cda, ["review", "--scope", scopeName, "--name", revName]);
    return { ok: true, action, reportName: revName, output: `${scopeOut}${approveOut}${reviewOut}` };
  }
  if (action === "dashboard") {
    const lang = params.lang === "en" ? "en" : "pl";
    const output = runNode(cda, ["dashboard", "--lang", lang]);
    return { ok: true, action, output };
  }
  throw new Error("UNSUPPORTED_ACTION");
}

/**
 * Explain stored reports with the connected model from the Mini UI.
 * Requires payload.consent === true (the operator ticked the send-summary box) and the session token.
 */
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
    .replace("__CDA_LANG__", initialLang === "en" ? "en" : "pl");
}

/** Start the local Mini Interface server on 127.0.0.1. */
export async function startMiniUi({ port = 3109, lang = "pl", openBrowser = true, rootDir = ROOT } = {}) {
  const token = crypto.randomBytes(24).toString("hex");
  const server = http.createServer(async (req, res) => {
    try {
      const actualPort = server.address()?.port || port;
      verifyLocalRequest(req, actualPort, {
        token,
        requireToken: req.method === "POST",
      });

      const url = new URL(req.url || "/", `http://127.0.0.1:${actualPort}`);
      const secure = { "Cache-Control": "no-store", "Content-Security-Policy": PANEL_CSP, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
      if (req.method === "GET" && url.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...secure });
        res.end(renderMiniUiHtml(token, lang));
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
      if (req.method === "GET" && url.pathname === "/api/status") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            agents: detectAgents(),
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
        const agents = detectAgents();
        const bridge = buildAgentBridge({
          host: reqHost,
          mission: url.searchParams.get("mission") || "demo",
          target: url.searchParams.get("target") || "",
          lang: url.searchParams.get("lang") || lang,
          executablePath: agents[reqHost]?.executablePath || reqHost,
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
        const reportsDir = resolveContainedPath(rootDir, ".cda", "reports");
        const filePath = resolveContainedPath(reportsDir, rawSegment);
        // Same rule as StateStore: no symlinked or hard-linked report files and no linked state directories.
        const linked = [path.join(rootDir, ".cda"), reportsDir].some((d) => fs.existsSync(d) && fs.lstatSync(d).isSymbolicLink());
        const stat = !linked && fs.existsSync(filePath) ? fs.lstatSync(filePath) : null;
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
        res.writeHead(200, { "Content-Type": types[ext] || "text/plain; charset=utf-8" });
        res.end(fs.readFileSync(filePath));
        return;
      }
      if (req.method === "POST") {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > (url.pathname === "/api/model/chat" ? 131072 : 16384)) throw new Error("PAYLOAD_TOO_LARGE");
        }
        const payload = JSON.parse(body || "{}");

        if (url.pathname === "/api/launch-agent") {
          const result = launchAgentSession(payload, { rootDir });
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
        code === "CONSENT_REQUIRED"
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
