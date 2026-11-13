import http from "node:http";
import crypto from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { StateStore, scopeDigest } from "./scope.mjs";
import { redact } from "./redact.mjs";

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
  let cursor = baseResolved;
  for (const part of ["", ...rel.split(path.sep)]) {
    if (part) cursor = path.join(cursor, part);
    let stat;
    try {
      stat = fs.lstatSync(cursor);
    } catch (error) {
      if (error.code === "ENOENT") break;
      throw error;
    }
    if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1)) {
      const error = new Error("STATE_LINK_BLOCKED");
      error.code = "STATE_LINK_BLOCKED";
      throw error;
    }
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

/** Launch npm's Windows shims through Node so prompts remain literal arguments. */
function agentInvocation(executable) {
  if (process.platform !== "win32" || !/\.(cmd|bat)$/i.test(executable)) {
    return { command: executable, args: [] };
  }
  const shim = fs.readFileSync(executable, "utf8");
  const match = /"%dp0%[\\/]([^"\r\n]+\.m?js)"/i.exec(shim);
  if (!match) throw new Error("UNSUPPORTED_AGENT_SHIM");
  const script = resolveContainedPath(path.dirname(executable), match[1]);
  if (!fs.statSync(script).isFile()) throw new Error("UNSUPPORTED_AGENT_SHIM");
  return { command: process.execPath, args: [script] };
}

function shellArgument(value) {
  const text = String(value);
  return process.platform === "win32"
    ? `'${text.replace(/(\\*)"/g, '$1$1\\"').replace(/'/g, "''")}'`
    : `'${text.replace(/'/g, "'\\''")}'`;
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
      let invocation = { command: bin, args: [] };
      const options = {
        encoding: "utf8",
        timeout: 2500,
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
      };
      let out;
      try {
        out = execSyncImpl(bin, ["--version"], options).trim();
      } catch (error) {
        if (platform !== "win32" || !/\.(cmd|bat)$/i.test(bin)) throw error;
        invocation = agentInvocation(bin);
        out = execSyncImpl(invocation.command, [...invocation.args, "--version"], options).trim();
      }
      const ver = out.split(/\r?\n/)[0]?.slice(0, 80) || "detected";
      versionByPath.push({ path: bin, version: ver });
      if (!chosen) chosen = { executablePath: bin, commandPath: invocation.command, commandArgs: invocation.args, version: ver };
    } catch {
      /* candidate failed */
    }
  }

  const distinctVersions = [...new Set(versionByPath.map((v) => v.version))];
  return {
    installed: Boolean(chosen),
    executablePath: chosen ? chosen.executablePath : host,
    commandPath: chosen?.commandPath || host,
    commandArgs: chosen?.commandArgs || [],
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
export function buildAgentBridge({ host = "claude", mission = "demo", target = "", lang = "pl", executablePath = null, executableArgs = [] } = {}) {
  const safeHost = validateAgentHost(typeof host === "string" ? host.toLowerCase() : "");
  const pl = lang === "pl";
  const cleanTarget = String(target || "").replace(/[\r\n\0]/g, " ").trim().slice(0, 200);
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
  const invocation = [resolvedBin, ...executableArgs, selected.prompt].map(shellArgument).join(" ");
  const cliCommand = process.platform === "win32"
    ? `& { $PSNativeCommandArgumentPassing = 'Legacy'; & ${invocation} }`
    : invocation;
  const quotedBin = shellArgument(resolvedBin);

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
    /not logged in|please run .*login|authentication failed|unauthorized|invalid api key|missing api key|HTTP\s*401|anthropic_api_key|openai_api_key|login required|token expired/i.test(
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

function saveSessionState(session, rootDir = ROOT) {
  new StateStore(rootDir).write("sessions", session.sessionId, session);
  return session;
}

/** List tracked agent CLI sessions (newest first). */
export function getAgentSessions(rootDir = ROOT) {
  const dir = resolveContainedPath(rootDir, ".cda", "sessions");
  if (!fs.existsSync(dir)) return [];
  const store = new StateStore(rootDir);
  return fs.readdirSync(dir)
    .filter((name) => /^[a-zA-Z0-9_-]{1,64}\.json$/.test(name))
    .flatMap((name) => {
      try { return [store.read("sessions", name.slice(0, -5))]; }
      catch { return []; }
    })
    .sort((a, b) => String(b.startedAt || "").localeCompare(String(a.startedAt || "")))
    .slice(0, 20);
}

/** Cancellation is final even when a child subsequently emits output or closes. */
export function stopAgentSession(sessionId, rootDir = ROOT) {
  const store = new StateStore(rootDir);
  const file = store.file("sessions", sessionId);
  const active = activeAgentProcesses.get(file);
  const session = active?.session || store.read("sessions", sessionId);
  if (!["running", "auth_error"].includes(session.status) || session.endedAt) return session;
  session.status = "cancelled";
  session.endedAt = new Date().toISOString();
  saveSessionState(session, rootDir);
  try { active?.process.kill("SIGTERM"); }
  catch (error) {
    if (error.code !== "ESRCH") {
      session.error = error.message;
      saveSessionState(session, rootDir);
    }
  }
  return session;
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
    executablePath: hostInfo.commandPath || hostInfo.executablePath || safeHost,
    executableArgs: hostInfo.commandArgs || [],
  });

  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const sessionId = `agent-${safeHost}-${stamp}-${crypto.randomBytes(6).toString("hex")}`;
  const store = new StateStore(rootDir);
  const promptFile = store.write("sessions", sessionId, bridge.prompt, "txt");
  const sessionFile = store.file("sessions", sessionId);
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
    promptFile,
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
    const args = safeHost === "claude" ? ["-p", "--", bridge.prompt]
      : safeHost === "codex" ? ["exec", "--", bridge.prompt] : [bridge.prompt];
    const invocation = hostInfo.commandPath
      ? { command: hostInfo.commandPath, args: hostInfo.commandArgs || [] }
      : agentInvocation(session.executablePath);
    const proc = spawnImpl(invocation.command, [...invocation.args, ...args], {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    activeAgentProcesses.set(sessionFile, { process: proc, session });
    let rawOutput = "";
    const appendOutput = (chunk) => {
      if (session.status === "cancelled" || session.error === "SESSION_OUTPUT_LIMIT") return;
      rawOutput += String(chunk ?? "");
      session.output = redact(rawOutput, Infinity).slice(-12000);
      if (Buffer.byteLength(rawOutput) > 2 * 1024 * 1024) {
        session.error = "SESSION_OUTPUT_LIMIT";
        proc.kill("SIGTERM");
      }
      saveSessionState(session, rootDir);
    };

    proc.stdout?.on("data", appendOutput);
    proc.stderr?.on("data", appendOutput);

    proc.on("error", (err) => {
      activeAgentProcesses.delete(sessionFile);
      if (session.status !== "cancelled") session.status = "failed";
      session.error = err.message || "SPAWN_ERROR";
      session.endedAt = new Date().toISOString();
      saveSessionState(session, rootDir);
    });

    proc.on("close", (code) => {
      activeAgentProcesses.delete(sessionFile);
      session.exitCode = code;
      session.endedAt = new Date().toISOString();
      const auth = detectAgentAuthError(session.output, safeHost, lang);
      if (code !== 0 && auth.isAuthError && session.status !== "cancelled") {
        session.authError = true;
        session.authHint = auth.hint;
        session.status = "auth_error";
        session.error = auth.hint;
      } else if (session.status !== "cancelled") {
        session.status = code === 0 && !session.error ? "completed" : "failed";
        if (code !== 0 && !session.error) {
          session.error =
            lang === "en"
              ? `Process exited with code ${code}.`
              : `Proces zakończył się kodem ${code}.`;
        }
      }
      saveSessionState(session, rootDir);
    });


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

/* ============================================================================
 * PRIORITY 3: GUIDED MULTI-STEP AUDIT WORKFLOW ENGINE (ASYNC, CANCEL, RESUME)
 * ========================================================================== */

const activeWorkflowChildren = new Map();

function saveRunState(run, rootDir = ROOT) {
  run.updatedAt = new Date().toISOString();
  new StateStore(rootDir).write("runs", run.runId, run);
  return run;
}

export function getGuidedAudit(runId, rootDir = ROOT) {
  return new StateStore(rootDir).read("runs", runId);
}

export function listGuidedAudits(rootDir = ROOT) {
  const dir = resolveContainedPath(rootDir, ".cda", "runs");
  if (!fs.existsSync(dir)) return [];
  const store = new StateStore(rootDir);
  return fs.readdirSync(dir)
    .filter((name) => /^[a-zA-Z0-9_-]{1,64}\.json$/.test(name))
    .flatMap((name) => {
      try { return [store.read("runs", name.slice(0, -5))]; }
      catch { return []; }
    })
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 25);
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
          requiresApproval: "package_names",
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
    if (!Array.isArray(params.files) || !params.files.length || params.files.length > 100 || params.files.some((file) => typeof file !== "string")) {
      throw new Error("EXPLICIT_FILES_REQUIRED");
    }
    const files = [...new Set(params.files)];
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
        requiresApproval: "scope",
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
  if (run.status === "awaiting_approval") {
    return pl ? "Sprawdź szczegóły kolejnego kroku i zatwierdź jego wykonanie." : "Review the next step and approve it to continue.";
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
  const defaultRunner = (step, runId) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [step.script, ...step.args], {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const key = new StateStore(rootDir).file("runs", runId);
    activeWorkflowChildren.set(key, child);
    let stdout = "";
    let stderr = "";
    let failure = null;
    const timer = setTimeout(() => {
      failure = new Error("STEP_TIMEOUT");
      child.kill("SIGTERM");
    }, 300_000);
    const collect = (chunk, isError) => {
      if (failure) return;
      if (isError) stderr += String(chunk); else stdout += String(chunk);
      if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > 2 * 1024 * 1024) {
        failure = new Error("STEP_OUTPUT_TOO_LARGE");
        child.kill("SIGTERM");
      }
    };
    child.stdout?.on("data", (chunk) => collect(chunk, false));
    child.stderr?.on("data", (chunk) => collect(chunk, true));
    child.on("error", (error) => {
      clearTimeout(timer);
      activeWorkflowChildren.delete(key);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      activeWorkflowChildren.delete(key);
      if (failure) return reject(failure);
      if (signal) return reject(new Error("WORKFLOW_CANCELLED"));
      if (code !== 0) return reject(new Error((stderr || stdout || `Step ${step.id} exited with code ${code}`).trim()));
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
    if (step.requiresApproval && !run.approvals?.[step.requiresApproval]) {
      run.status = "awaiting_approval";
      run.pendingApproval = {
        kind: step.requiresApproval,
        token: crypto.randomBytes(16).toString("hex"),
        ...(step.requiresApproval === "scope" ? { root: run.scopeProposal.root, files: run.scopeProposal.files } : {}),
      };
      run.nextStep = computeNextStepRecommendation(run);
      saveRunState(run, rootDir);
      return run;
    }

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
      step.output = String(output || "").slice(0, 4000);
      if (step.id === "scope") {
        const scope = JSON.parse(String(output).split("\nAwaiting explicit approval.")[0]);
        if (scope.approved !== false || !Array.isArray(scope.files) || typeof scope.root !== "string") {
          throw new Error("INVALID_SCOPE_PROPOSAL");
        }
        run.scopeProposal = scope;
        const approvalStep = run.steps.find((item) => item.id === "approve");
        approvalStep.args.push("--proposal", scopeDigest(scope));
      }
      step.status = "completed";
      step.finishedAt = new Date().toISOString();
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
  const runId = `run-${workflow}-${stamp}-${crypto.randomBytes(6).toString("hex")}`;
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
    approvals: { package_names: params.sharePackageNames === true },
    pendingApproval: null,
    steps: def.steps.map((s) => ({
      ...s,
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
  return runGuidedExecution(run, { rootDir, stepRunner, awaitCompletion });
}

const activeWorkflowRuns = new Map();

function runGuidedExecution(run, { rootDir, stepRunner, awaitCompletion }) {
  const key = new StateStore(rootDir).file("runs", run.runId);
  const completion = Promise.resolve()
    .then(() => executeWorkflowSteps(run, { rootDir, stepRunner }))
    .catch((error) => {
      run.status = "failed";
      run.error = error.message;
      run.nextStep = computeNextStepRecommendation(run);
      return saveRunState(run, rootDir);
    })
    .finally(() => activeWorkflowRuns.delete(key));
  activeWorkflowRuns.set(key, completion);
  return awaitCompletion ? completion : Promise.resolve(run);
}

/** Cancel is idempotent and retains the active child until its close event. */
export function cancelGuidedAudit(runId, { rootDir = ROOT } = {}) {
  const run = getGuidedAudit(runId, rootDir);
  if (["completed", "cancelled"].includes(run.status)) return run;
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
  const key = new StateStore(rootDir).file("runs", run.runId);
  activeWorkflowChildren.get(key)?.kill("SIGTERM");
  return run;
}

/** Resume waits for a cancelled child to close, so two attempts cannot overlap. */
export async function resumeGuidedAudit(runId, { rootDir = ROOT, stepRunner = null, awaitCompletion = false } = {}) {
  const key = new StateStore(rootDir).file("runs", runId);
  const active = activeWorkflowRuns.get(key);
  if (active) {
    const current = getGuidedAudit(runId, rootDir);
    if (current.status === "running") return awaitCompletion ? active : current;
    await active;
    const resumed = activeWorkflowRuns.get(key);
    if (resumed) return awaitCompletion ? resumed : getGuidedAudit(runId, rootDir);
  }
  const run = getGuidedAudit(runId, rootDir);
  if (run.status === "completed") return run;
  if (run.status === "awaiting_approval" && run.pendingApproval) return run;
  if (!run.approvals) {
    run.approvals = {};
    for (const step of run.steps) {
      if (run.workflow === "pc" && step.id === "advisories") step.requiresApproval = "package_names";
      if (run.workflow === "project" && ["scope", "approve"].includes(step.id)) {
        step.status = "pending";
        if (step.id === "approve") step.requiresApproval = "scope";
      }
    }
  }
  run.status = "running";
  run.error = null;
  run.finishedAt = null;
  for (const step of run.steps) {
    if (["failed", "cancelled", "running"].includes(step.status)) {
      step.status = "pending";
      step.error = null;
      step.startedAt = null;
      step.finishedAt = null;
      step.output = "";
    }
  }
  run.nextStep = computeNextStepRecommendation(run);
  saveRunState(run, rootDir);
  return runGuidedExecution(run, { rootDir, stepRunner, awaitCompletion });
}

/** Approve only the displayed step and its current proposal token. */
export async function approveGuidedAudit(runId, { approvalToken, rootDir = ROOT, stepRunner = null, awaitCompletion = false } = {}) {
  const run = getGuidedAudit(runId, rootDir);
  if (run.status !== "awaiting_approval" || !run.pendingApproval || run.pendingApproval.token !== approvalToken) {
    throw new Error("APPROVAL_REQUIRED");
  }
  run.approvals ||= {};
  run.approvals[run.pendingApproval.kind] = true;
  run.pendingApproval = null;
  saveRunState(run, rootDir);
  return resumeGuidedAudit(runId, { rootDir, stepRunner, awaitCompletion });
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

function renderMiniUiHtml(token, initialLang = "pl") {
  const markup = `<!doctype html>
<html lang="${initialLang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cyber Defense Agent v0.2 — Command Center & Guided Audit</title>
  <style>
    :root {
      --bg: #07090e;
      --surface: #0d121b;
      --raised: #131b28;
      --line: rgba(255, 255, 255, 0.09);
      --line-emerald: rgba(52, 211, 153, 0.38);
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #34d399;
      --accent-dark: #10b981;
      --cyan: #38bdf8;
      --amber: #fbbf24;
      --rose: #fb7185;
      --mono: "IBM Plex Mono", "Cascadia Code", Consolas, monospace;
      --sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(ellipse at 80% 0%, rgba(16, 185, 129, 0.12), transparent 55%), var(--bg);
      color: var(--text);
      font-family: var(--sans);
      line-height: 1.6;
      min-height: 100vh;
      padding-bottom: 60px;
    }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      background: rgba(7, 9, 14, 0.86);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--line);
      padding: 14px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 700;
      font-size: 18px;
      letter-spacing: -0.03em;
    }
    .brand-shield {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: rgba(52, 211, 153, 0.12);
      border: 1px solid var(--line-emerald);
      display: grid;
      place-items: center;
      color: var(--accent);
      font-weight: 800;
    }
    .brand small {
      display: block;
      font: 10px var(--mono);
      color: var(--accent);
      letter-spacing: 0.16em;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge {
      font: 11px var(--mono);
      padding: 5px 10px;
      border-radius: 999px;
      background: rgba(52, 211, 153, 0.1);
      border: 1px solid rgba(52, 211, 153, 0.28);
      color: #6ee7b7;
    }
    .lang-switch {
      display: inline-flex;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 2px;
      background: var(--surface);
    }
    .lang-switch button {
      border: 0;
      background: transparent;
      color: var(--muted);
      font: 600 11px var(--mono);
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
    }
    .lang-switch button.active {
      background: rgba(52, 211, 153, 0.18);
      color: #6ee7b7;
    }
    .shell {
      max-width: 1280px;
      margin: 26px auto 0;
      padding: 0 24px;
      display: grid;
      gap: 22px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 22px;
    }
    @media (max-width: 960px) {
      .grid-2 { grid-template-columns: 1fr; }
    }
    .card {
      background: linear-gradient(180deg, #0e141f 0%, #090d14 100%);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 22px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 40px -16px rgba(0,0,0,0.6);
    }
    .eyebrow {
      font: 600 10px var(--mono);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 6px;
      display: block;
    }
    h2 {
      font-size: 20px;
      letter-spacing: -0.03em;
      margin-bottom: 6px;
    }
    .sub {
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 16px;
    }
    .agents-row, .workflow-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .wf-pill, .agent-pill { color: inherit; font: inherit; text-align: left; }
    .workflow-row {
      grid-template-columns: repeat(4, 1fr);
    }
    .agent-pill, .wf-pill {
      padding: 11px 13px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.02);
      cursor: pointer;
      transition: all 0.18s;
    }
    .agent-pill.active, .wf-pill.active {
      border-color: var(--accent);
      background: rgba(52, 211, 153, 0.09);
    }
    .agent-pill strong, .wf-pill strong {
      display: block;
      font-size: 13.5px;
    }
    .agent-pill small, .wf-pill small {
      font: 10.5px var(--mono);
      color: var(--muted);
      display: block;
      margin-top: 2px;
    }
    .status-ok { color: #6ee7b7 !important; }
    .status-warn { color: var(--amber) !important; }
    .status-err { color: var(--rose) !important; }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    label {
      display: block;
      font: 600 11px var(--mono);
      color: #cbd5e1;
      margin-bottom: 6px;
    }
    select, input[type="text"], textarea {
      width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid var(--line);
      background: #070a10;
      color: var(--text);
      font: 13px var(--sans);
    }
    .prompt-box {
      background: #06080d;
      border: 1px solid rgba(52, 211, 153, 0.25);
      border-radius: 10px;
      padding: 12px 14px;
      font: 12px/1.55 var(--mono);
      color: #d1fae5;
      margin-bottom: 14px;
      word-break: break-word;
    }
    .btn-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 15px;
      border-radius: 9px;
      font: 650 12.5px var(--sans);
      cursor: pointer;
      border: 1px solid transparent;
      transition: transform 0.15s, border-color 0.15s;
      text-decoration: none;
    }
    .btn-primary {
      background: linear-gradient(180deg, #34d399 0%, #10b981 100%);
      color: #03140d;
      border-color: rgba(167, 243, 208, 0.55);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 18px -4px rgba(16,185,129,0.4);
    }
    .btn-secondary {
      background: rgba(255,255,255,0.04);
      border-color: var(--line);
      color: var(--text);
    }
    .btn-secondary:hover {
      border-color: var(--line-emerald);
      background: rgba(52, 211, 153, 0.07);
    }
    .btn-danger {
      background: rgba(251, 113, 133, 0.12);
      border-color: rgba(251, 113, 133, 0.4);
      color: #fecdd3;
    }
    .consent-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      background: rgba(251, 191, 36, 0.07);
      border: 1px solid rgba(251, 191, 36, 0.25);
      color: #fde68a;
      font-size: 12px;
      margin-bottom: 14px;
    }
    .steps-list {
      display: grid;
      gap: 8px;
      margin: 14px 0;
    }
    .step-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 12px;
      border-radius: 8px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.015);
      font-size: 12.5px;
    }
    .step-status {
      font: 600 11px var(--mono);
      padding: 2px 8px;
      border-radius: 99px;
    }
    .next-step-box {
      padding: 12px 14px;
      border-radius: 9px;
      border-left: 3px solid var(--accent);
      background: rgba(52, 211, 153, 0.06);
      font-size: 12.5px;
      margin-top: 10px;
    }
    .console {
      background: #05070b;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 14px;
      font: 12px/1.6 var(--mono);
      color: #a7f3d0;
      min-height: 150px;
      max-height: 280px;
      overflow: auto;
      white-space: pre-wrap;
    }
    .reports-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .report-chip {
      font: 11px var(--mono);
      padding: 6px 10px;
      border-radius: 7px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.03);
      color: #e2e8f0;
      text-decoration: none;
    }
    .report-chip:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .history-list {
      display: grid;
      gap: 8px;
      margin-top: 12px;
      max-height: 220px;
      overflow: auto;
    }
    .footer-credit {
      text-align: center;
      margin-top: 28px;
      font-size: 12px;
      color: var(--muted);
    }
    .footer-credit a { color: var(--accent); font-weight: 600; text-decoration: none; }
    [hidden] { display: none !important; }
    .shell, .grid-2, .card, .form-row > div { min-width: 0; }
    .grid-2 { align-items: start; }
    .agent-pill { align-self: start; }
    .grid-2 { grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr); }
    .agents-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .workflow-row { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .agent-pill, .wf-pill, .report-chip { min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
    .step-item > *, .next-step-box { min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
    .prompt-box { white-space: pre-wrap; max-width: 100%; }
    .form-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    .brand, .brand > div { min-width: 0; }
    .brand-shield, .lang-switch { flex-shrink: 0; }
    @media (max-width: 960px) {
      .grid-2 { grid-template-columns: minmax(0, 1fr); }
    }
    @media (max-width: 640px) {
      .topbar { padding: 12px 16px; }
      .badge { display: none; }
      .brand { font-size: 15px; }
      .shell { padding: 0 12px; }
      .card { padding: 16px; }
      .agents-row, .workflow-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .form-row { grid-template-columns: minmax(0, 1fr); }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="brand">
      <div class="brand-shield">🛡️</div>
      <div>
        <span>cyber<span style="color:#94a3b8;font-weight:400">defense</span> · command center</span>
        <small>AI EVOLUTION POLSKA · V0.2</small>
      </div>
    </div>
    <div class="topbar-right">
      <span class="badge" id="guard-badge">127.0.0.1 · TYLKO ODCZYT · HOST/ORIGIN GUARD</span>
      <div class="lang-switch">
        <button type="button" id="lang-pl" class="${initialLang === "pl" ? "active" : ""}" onclick="setLang('pl')">PL</button>
        <button type="button" id="lang-en" class="${initialLang === "en" ? "active" : ""}" onclick="setLang('en')">EN</button>
      </div>
    </div>
  </header>

  <main class="shell">
    <div class="grid-2">
      <!-- GUIDED AUDIT WORKFLOW (PRIORITY 3) -->
      <section class="card">
        <span class="eyebrow">01 / PROWADZONY AUDYT KROK PO KROKU</span>
        <h2>Wybierz cel: Komputer, Projekt, Strona lub Demo</h2>
        <p class="sub">Każde uruchomienie ma własny identyfikator, historię kroków, możliwość anulowania i wznowienia po błędzie.</p>

        <div class="workflow-row">
          <button type="button" class="wf-pill active" id="wf-pc" onclick="selectWorkflow('pc')">
            <strong>💻 Komputer</strong>
            <small>Inwentarz + CVE + Windows</small>
          </button>
          <button type="button" class="wf-pill" id="wf-project" onclick="selectWorkflow('project')">
            <strong>📁 Projekt</strong>
            <small>Scope + Kod v0.2 + Deps</small>
          </button>
          <button type="button" class="wf-pill" id="wf-web" onclick="selectWorkflow('web')">
            <strong>🌐 Strona WWW</strong>
            <small>HTTPS / CSP / Cookies / TLS</small>
          </button>
          <button type="button" class="wf-pill" id="wf-demo" onclick="selectWorkflow('demo')">
            <strong>🚀 Demo</strong>
            <small>Wykrycie → Fix → Retest</small>
          </button>
        </div>

        <div style="margin-bottom: 12px;">
          <label for="wf-target">Ścieżka projektu lub adres URL (dla Projekt / Strona WWW):</label>
          <input type="text" id="wf-target" placeholder="np. ./ lub https://twoja-strona.pl" oninput="syncTarget(this.value)" />
        </div>

        <div id="wf-files-group" hidden style="margin-bottom:12px;">
          <label for="wf-files">Pliki względne do katalogu projektu, po jednym w wierszu</label>
          <textarea id="wf-files" rows="4" placeholder="package.json&#10;package-lock.json"></textarea>
        </div>
        <label class="consent-bar" id="workflow-consent">
          <input type="checkbox" id="consent-check" />
          <span id="consent-label">Zgadzam się na lokalny odczyt listy programów i portów.</span>
        </label>

        <div class="btn-row">
          <button class="btn btn-primary" type="button" id="start-workflow-btn" onclick="startWorkflow()">▶ Uruchom prowadzony audyt</button>
          <button class="btn btn-danger" type="button" id="cancel-wf-btn" onclick="cancelCurrentWorkflow()" style="display:none">⏹ Anuluj bieżący audyt</button>
          <button class="btn btn-secondary" type="button" id="resume-wf-btn" onclick="resumeCurrentWorkflow()" style="display:none">↻ Wznów od błędu / przerwania</button>
          <a class="btn btn-secondary" href="/report/dashboard.html" target="_blank">📊 Otwórz Dashboard ↗</a>
        </div>

        <div id="active-run-box" style="margin-top:16px;"></div>
      </section>

      <!-- AGENT BRIDGE & SESSION TRACKER (PRIORITY 1 & 2) -->
      <section class="card">
        <span class="eyebrow">02 / MOSTEK CLAUDE CODE CLI & CODEX CLI</span>
        <h2>Uruchomienie agenta ze stanem sesji</h2>
        <p class="sub">Przekazuje wybrane zadanie bezpośrednio do ujednoliconego pliku wykonywalnego CLI i monitoruje stan logowania.</p>

        <div class="agents-row" id="agents-row"></div>

        <div class="form-row">
          <div>
            <label for="mission-select">Zadanie dla agenta</label>
            <select id="mission-select" onchange="refreshBridge()">
              <option value="demo">🚀 Szybkie Demo End-to-End</option>
              <option value="code">🔍 Audyt kodu i zależności projektu</option>
              <option value="pc">💻 Audyt komputera (OSV + KEV + Windows)</option>
              <option value="web">🌐 Pasywny audyt strony WWW</option>
              <option value="report">📄 Wygeneruj raport HTML/PDF + Dashboard</option>
            </select>
          </div>
          <div>
            <label for="target-input">Cel zadania (ścieżka / URL)</label>
            <input type="text" id="target-input" placeholder="np. ./ lub https://twoja-strona.pl" oninput="refreshBridge()" />
          </div>
        </div>

        <label>Ujednolicona komenda CLI i przekazywany prompt:</label>
        <div class="prompt-box" id="bridge-command"></div>

        <div class="btn-row">
          <button class="btn btn-primary" type="button" id="launch-agent-btn" onclick="launchAgentTerminal()">⚡ Uruchom agenta z tym zadaniem</button>
          <button class="btn btn-secondary" type="button" onclick="copyCommand('cli')">📋 Kopiuj komendę CLI</button>
          <button class="btn btn-secondary" type="button" onclick="copyCommand('prompt')">💬 Kopiuj sam prompt</button>
        </div>

        <div id="agent-sessions-box" style="margin-top:16px;"></div>
      </section>
    </div>

    <!-- CONSOLE, RUN HISTORY & REPORTS -->
    <section class="card">
      <span class="eyebrow">03 / HISTORIA URUCHOMIEŃ, KONSOLA I RAPORTY (.CDA/REPORTS)</span>
      <div class="console" id="console-out" role="status" aria-live="polite">Gotowy. Wybierz prowadzony audyt lub uruchom sesję Claude Code / Codex CLI.</div>
      <div class="history-list" id="runs-history"></div>
      <div class="reports-grid" id="reports-list"></div>
    </section>

    <div class="footer-credit">
      Cyber Defense Agent v0.2 · Stworzone przez <a href="https://github.com/aievolutionpl" target="_blank">AI Evolution Polska</a> · MIT Open Source
    </div>
  </main>

  <script>
    const TOKEN = ${JSON.stringify(token)};
    const state = { lang: ${JSON.stringify(initialLang)}, host: 'claude', workflow: 'pc', activeRunId: null, agents: {}, bridge: {}, runs: [], sessions: [] };
    const t = (pl, en) => state.lang === 'en' ? en : pl;
    let loadingStatus = false;
    let bridgeRequest = 0;
    function element(tag, text, className) {
      const node = document.createElement(tag);
      if (text !== undefined) node.textContent = String(text);
      if (className) node.className = className;
      return node;
    }
    function message(text) { document.getElementById('console-out').textContent = text; }
    async function request(url, payload) {
      try {
        const response = await fetch(url, payload === undefined ? {} : {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cda-token': TOKEN }, body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok || data.ok === false) throw new Error(data.error || data.message || 'REQUEST_FAILED');
        return data;
      } catch (error) {
        message(t('Błąd operacji. ', 'Operation failed. ') + error.message);
        return null;
      }
    }
    function syncTarget(value) { document.getElementById('target-input').value = value; refreshBridge(); }
    function setLang(lang) { window.location.search = '?lang=' + encodeURIComponent(lang); }
    function selectWorkflow(workflow) {
      state.workflow = workflow;
      for (const id of ['pc', 'project', 'web', 'demo']) {
        const button = document.getElementById('wf-' + id);
        button.classList.toggle('active', id === workflow);
        button.setAttribute('aria-pressed', String(id === workflow));
      }
      document.getElementById('wf-files-group').hidden = workflow !== 'project';
      document.getElementById('workflow-consent').hidden = workflow === 'demo';
      document.getElementById('consent-check').checked = false;
      const labels = {
        pc: t('Zgadzam się na lokalny odczyt listy programów i portów.', 'I approve a local inventory of installed programs and listening ports.'),
        project: t('Zgadzam się na przygotowanie zakresu dla wskazanych plików.', 'I approve preparing a scope for the listed files.'),
        web: t('Potwierdzam uprawnienia do tej strony i zatwierdzam jej pasywne sprawdzenie.', 'I am authorized to assess this website and approve passive checks.')
      };
      document.getElementById('consent-label').textContent = labels[workflow] || '';
      document.getElementById('mission-select').value = { pc: 'pc', project: 'code', web: 'web', demo: 'demo' }[workflow];
      refreshBridge();
    }
    async function loadStatus() {
      if (loadingStatus) return;
      loadingStatus = true;
      try {
        const data = await request('/api/status');
        if (!data) return;
        state.agents = data.agents || {};
        state.runs = data.runs || [];
        state.sessions = data.sessions || [];
        if (!state.activeRunId && state.runs.length) state.activeRunId = state.runs[0].runId;
        renderAgents(); renderActiveRun(); renderRunsHistory(); renderAgentSessions(); renderReports(data.reports || []);
      } finally { loadingStatus = false; }
    }
    function renderAgents() {
      const row = document.getElementById('agents-row');
      row.replaceChildren();
      for (const [id, info] of Object.entries(state.agents)) {
        const button = element('button', undefined, 'agent-pill' + (state.host === id ? ' active' : ''));
        button.type = 'button';
        button.setAttribute('aria-pressed', String(state.host === id));
        button.append(element('strong', info.name), element('small', info.installed ? info.version : t('Skill gotowy', 'Skill available'), info.installed ? 'status-ok' : 'status-warn'));
        if (info.executablePath) button.append(element('small', info.executablePath));
        if (info.versionWarning) {
          const warning = element('small', t('Kilka wersji CLI', 'Multiple CLI versions'), 'status-warn');
          warning.title = info.versionWarning;
          button.append(warning);
        }
        button.onclick = () => { state.host = id; renderAgents(); refreshBridge(); };
        row.append(button);
      }
    }
    function reportLink(name) {
      const link = element('a', name, 'report-chip');
      link.href = '/report/' + encodeURIComponent(name);
      link.target = '_blank'; link.rel = 'noopener';
      return link;
    }
    function renderActiveRun() {
      const box = document.getElementById('active-run-box');
      const run = state.runs.find(item => item.runId === state.activeRunId) || state.runs[0];
      document.getElementById('cancel-wf-btn').style.display = run && ['running', 'awaiting_approval'].includes(run.status) ? 'inline-flex' : 'none';
      document.getElementById('resume-wf-btn').style.display = run && ['failed', 'cancelled'].includes(run.status) ? 'inline-flex' : 'none';
      box.replaceChildren();
      if (!run) return;
      state.activeRunId = run.runId;
      box.append(element('p', run.runId + ' · ' + run.status));
      const steps = element('div', undefined, 'steps-list');
      for (const step of run.steps || []) {
        const row = element('div', undefined, 'step-item');
        row.append(element('span', step.label), element('span', step.status, 'step-status'));
        steps.append(row);
      }
      box.append(steps);
      if (run.pendingApproval) {
        const approval = run.pendingApproval;
        const text = approval.kind === 'scope'
          ? t('Zatwierdź odczyt dokładnie tego zakresu.', 'Approve reading this exact scope.')
          : t('Zatwierdź wysłanie nazw i wersji pakietów do OSV.dev oraz pobranie listy CISA KEV.', 'Approve sharing package names and versions with OSV.dev and downloading the CISA KEV list.');
        box.append(element('p', text));
        if (approval.kind === 'scope') box.append(element('pre', approval.root + '\\n' + approval.files.join('\\n'), 'prompt-box'));
        const button = element('button', t('Zatwierdź ten krok', 'Approve this step'), 'btn btn-primary');
        button.type = 'button'; button.id = 'approve-workflow-btn';
        button.onclick = async () => {
          button.disabled = true;
          await request('/api/workflows/approve', { runId: run.runId, approvalToken: approval.token });
          await loadStatus();
        };
        box.append(button);
      }
      if (run.nextStep) box.append(element('p', run.nextStep, 'next-step-box'));
      const links = element('div', undefined, 'reports-grid');
      for (const report of run.reports || []) links.append(reportLink(report));
      box.append(links);
    }
    function renderRunsHistory() {
      const box = document.getElementById('runs-history');
      box.replaceChildren();
      for (const run of state.runs.slice(0, 6)) {
        const row = element('div', undefined, 'step-item');
        const created = new Date(run.createdAt);
        const timestamp = Number.isFinite(created.getTime()) ? created.toLocaleString(state.lang === 'pl' ? 'pl-PL' : 'en-GB') : run.runId;
        const select = element('button', run.title + ' · ' + timestamp + (run.target ? ' · ' + run.target : '') + ' · ' + run.status, 'btn btn-secondary');
        select.type = 'button'; select.onclick = () => { state.activeRunId = run.runId; renderActiveRun(); };
        row.append(select);
        if (['failed', 'cancelled'].includes(run.status)) {
          const resume = element('button', t('Wznów', 'Resume'), 'btn btn-secondary');
          resume.type = 'button'; resume.onclick = () => resumeRunById(run.runId); row.append(resume);
        }
        box.append(row);
      }
    }
    function renderAgentSessions() {
      const box = document.getElementById('agent-sessions-box');
      box.replaceChildren();
      const session = state.sessions[0];
      if (!session) return;
      box.append(element('p', session.hostName + ' · ' + session.status));
      if (session.authHint || session.error) box.append(element('p', session.authHint || session.error, 'status-warn'));
      const output = element('pre', session.output || t('Oczekiwanie na wynik sesji.', 'Waiting for session output.'), 'console');
      output.id = 'session-output'; output.style.maxHeight = '240px'; output.style.overflow = 'auto'; box.append(output);
      if (!session.endedAt) {
        const stop = element('button', t('Zatrzymaj sesję', 'Stop session'), 'btn btn-danger'); stop.type = 'button';
        stop.onclick = async () => { await request('/api/agent-sessions/stop', { sessionId: session.sessionId }); await loadStatus(); };
        box.append(stop);
      }
    }
    function renderReports(reports) {
      const box = document.getElementById('reports-list'); box.replaceChildren();
      for (const report of reports) box.append(reportLink(report.name));
    }
    async function refreshBridge() {
      const sequence = ++bridgeRequest;
      const params = new URLSearchParams({ host: state.host, mission: document.getElementById('mission-select').value, target: document.getElementById('target-input').value, lang: state.lang });
      const data = await request('/api/bridge?' + params);
      if (!data || sequence !== bridgeRequest) return;
      state.bridge = data;
      document.getElementById('bridge-command').textContent = data.cliCommand + '\\n\\n' + data.prompt;
    }
    async function copyCommand(kind) {
      try {
        const text = kind === 'cli' ? state.bridge.cliCommand : state.bridge.prompt;
        if (!text) return;
        await navigator.clipboard.writeText(text);
        message(t('Skopiowano do schowka.\\n', 'Copied to clipboard.\\n') + text);
      } catch (error) { message(t('Błąd schowka. ', 'Clipboard error. ') + error.message); }
    }
    async function launchAgentTerminal() {
      const button = document.getElementById('launch-agent-btn'); button.disabled = true;
      message(t('Uruchamianie sesji agenta…', 'Starting agent session…'));
      const data = await request('/api/launch-agent', { host: state.host, mission: document.getElementById('mission-select').value, target: document.getElementById('target-input').value, lang: state.lang });
      button.disabled = false;
      if (data) message(data.message);
      await loadStatus();
    }
    async function startWorkflow() {
      const button = document.getElementById('start-workflow-btn'); button.disabled = true;
      const files = document.getElementById('wf-files').value.split('\\n').map(file => file.trim()).filter(Boolean);
      const data = await request('/api/workflows/start', { workflow: state.workflow, consent: document.getElementById('consent-check').checked, target: document.getElementById('wf-target').value, files, lang: state.lang });
      button.disabled = false;
      if (data) { state.activeRunId = data.run.runId; message(t('Uruchomiono audyt ', 'Started audit ') + data.run.runId); }
      await loadStatus();
    }
    async function cancelCurrentWorkflow() {
      if (!state.activeRunId) return;
      await request('/api/workflows/cancel', { runId: state.activeRunId }); await loadStatus();
    }
    async function resumeCurrentWorkflow() { if (state.activeRunId) await resumeRunById(state.activeRunId); }
    async function resumeRunById(runId) {
      const data = await request('/api/workflows/resume', { runId });
      if (data) state.activeRunId = runId;
      await loadStatus();
    }
    selectWorkflow('pc'); loadStatus();
    setInterval(() => {
      if (!document.hidden && (state.runs.some(run => run.status === 'running') || state.sessions.some(session => !session.endedAt))) loadStatus();
    }, 1500);
  </script>
</body>
</html>`;
  const translations = {
  "01 / PROWADZONY AUDYT KROK PO KROKU": "GUIDED AUDIT",
  "Wybierz cel: Komputer, Projekt, Strona lub Demo": "Choose a computer, project, website or demo",
  "Każde uruchomienie ma własny identyfikator, historię kroków, możliwość anulowania i wznowienia po błędzie.": "Track each run, review its steps, cancel it or resume after an error.",
  "💻 Komputer": "💻 Computer",
  "📁 Projekt": "📁 Project",
  "🌐 Strona WWW": "🌐 Website",
  "Inwentarz + CVE + Windows": "Inventory and vulnerability evidence",
  "Scope + Kod v0.2 + Deps": "Scope, code and dependencies",
  "Wykrycie → Fix → Retest": "Finding → Fix → Retest",
  "Ścieżka projektu lub adres URL (dla Projekt / Strona WWW):": "Project directory or website URL",
  "Pliki względne do katalogu projektu, po jednym w wierszu": "Files relative to the project directory, one per line",
  "np. ./ lub https://twoja-strona.pl": "e.g. ./ or https://your-site.example",
  "▶ Uruchom prowadzony audyt": "▶ Start guided audit",
  "⏹ Anuluj bieżący audyt": "⏹ Cancel current audit",
  "↻ Wznów od błędu / przerwania": "↻ Resume audit",
  "📊 Otwórz Dashboard ↗": "📊 Open dashboard ↗",
  "02 / MOSTEK CLAUDE CODE CLI & CODEX CLI": "CLAUDE CODE AND CODEX",
  "Uruchomienie agenta ze stanem sesji": "Agent sessions",
  "Przekazuje wybrane zadanie bezpośrednio do ujednoliconego pliku wykonywalnego CLI i monitoruje stan logowania.": "Send the selected task to your installed CLI and follow its output and session status.",
  "Zadanie dla agenta": "Agent task",
  "Szybkie Demo End-to-End": "Synthetic demo",
  "Audyt kodu i zależności projektu": "Project code and dependencies",
  "Audyt komputera (OSV + KEV + Windows)": "Computer vulnerability review",
  "Pasywny audyt strony WWW": "Passive website check",
  "Wygeneruj raport HTML/PDF + Dashboard": "Generate report and dashboard",
  "Cel zadania (ścieżka / URL)": "Task target (directory or URL)",
  "Ujednolicona komenda CLI i przekazywany prompt:": "CLI command and mission prompt",
  "⚡ Uruchom agenta z tym zadaniem": "⚡ Start agent session",
  "📋 Kopiuj komendę CLI": "📋 Copy CLI command",
  "💬 Kopiuj sam prompt": "💬 Copy prompt",
  "03 / HISTORIA URUCHOMIEŃ, KONSOLA I RAPORTY (.CDA/REPORTS)": "RUN HISTORY AND REPORTS",
  "Gotowy. Wybierz prowadzony audyt lub uruchom sesję Claude Code / Codex CLI.": "Ready. Choose an audit or start an agent session.",
  "Stworzone przez": "Created by",
  "TYLKO ODCZYT": "READ ONLY"
};
  return initialLang === "en" ? Object.entries(translations).reduce((html, [polish, english]) => html.replaceAll(polish, english), markup) : markup;
}

/** Start the local Mini Interface server on 127.0.0.1. */
export async function startMiniUi({ port = 3109, lang = "pl", openBrowser = true, rootDir = ROOT, agentsMap = null } = {}) {
  const token = crypto.randomBytes(24).toString("hex");
  let agents = agentsMap;
  const getAgents = () => agents ||= detectAgents();
  const server = http.createServer(async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
      const actualPort = server.address()?.port || port;
      verifyLocalRequest(req, actualPort, {
        token,
        requireToken: req.method === "POST",
      });

      const url = new URL(req.url || "/", `http://127.0.0.1:${actualPort}`);
      if (req.method === "GET" && url.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        res.end(renderMiniUiHtml(token, url.searchParams.get("lang") === "en" ? "en" : url.searchParams.get("lang") === "pl" ? "pl" : lang));
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
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
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
          res.writeHead(200, { "Content-Type": types[ext] || "text/plain; charset=utf-8" });
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
          if (body.length > 16384) throw new Error("PAYLOAD_TOO_LARGE");
        }
        const payload = JSON.parse(body || "{}");
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("INVALID_PAYLOAD");

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
        code === "INVALID_AGENT_HOST"
        || code === "STATE_LINK_BLOCKED"
          ? 403
          : 400;
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: code }));
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
