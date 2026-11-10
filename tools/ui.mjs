import http from "node:http";
import crypto from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Safely detect installed AI agent CLIs without shell interpolation. */
export function detectAgents() {
  const probe = (bin, args = ["--version"]) => {
    try {
      const out = execFileSync(bin, args, {
        encoding: "utf8",
        timeout: 2000,
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
      }).trim();
      return { installed: true, version: out.split(/\r?\n/)[0]?.slice(0, 80) || "detected" };
    } catch {
      return { installed: false, version: null };
    }
  };
  const claude = probe(process.platform === "win32" ? "claude.cmd" : "claude");
  const claudeFallback = claude.installed ? claude : probe("claude");
  const codex = probe(process.platform === "win32" ? "codex.cmd" : "codex");
  const codexFallback = codex.installed ? codex : probe("codex");

  return {
    claude: {
      name: "Claude Code CLI",
      command: "claude",
      entry: ".claude/skills/cyber-defense/SKILL.md",
      entryExists: fs.existsSync(path.join(ROOT, ".claude/skills/cyber-defense/SKILL.md")),
      ...claudeFallback,
    },
    codex: {
      name: "OpenAI Codex CLI",
      command: "codex",
      entry: ".agents/skills/cyber-defense/SKILL.md",
      entryExists: fs.existsSync(path.join(ROOT, ".agents/skills/cyber-defense/SKILL.md")),
      ...codexFallback,
    },
    hermes: {
      name: "Hermes Agent",
      command: "hermes",
      entry: ".hermes/skills/cyber-defense/SKILL.md",
      entryExists: fs.existsSync(path.join(ROOT, ".hermes/skills/cyber-defense/SKILL.md")),
      installed: false,
      version: null,
    },
  };
}

/** Build structured prompts and CLI invocations for Claude Code and Codex. */
export function buildAgentBridge({ host = "claude", mission = "demo", target = "", lang = "pl" } = {}) {
  const pl = lang === "pl";
  const cleanTarget = String(target || "").replace(/[\r\n"`$]/g, "").trim().slice(0, 200);
  const prefix = host === "codex" ? "$cyber-defense" : "/cyber-defense";

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
        ? `${prefix} Sprawdź ten komputer pod kątem zainstalowanych programów, otwartych portów oraz znanych luk w OSV.dev i CISA KEV. Przed każdym krokiem zapytaj mnie o zgodę na użycie flag --yes oraz --share-package-names.`
        : `${prefix} Check this machine for installed software, open ports, and known vulnerabilities in OSV.dev and CISA KEV. Ask for my consent before using --yes and --share-package-names.`,
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

  const selected = missions[mission] || missions.demo;
  const bin = host === "codex" ? "codex" : "claude";
  const cliCommand = `${bin} "${selected.prompt.replace(/"/g, '\\"')}"`;

  return {
    host,
    bin,
    mission,
    title: selected.title,
    prompt: selected.prompt,
    cliCommand,
    interactiveCommand: bin,
  };
}

/** List existing reports in .cda/reports/ safely. */
export function listReportsSummary() {
  const dir = path.join(ROOT, ".cda", "reports");
  if (!fs.existsSync(dir)) return [];
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(json|md|html|pdf|sarif)$/i.test(f))
      .map((name) => {
        const stat = fs.statSync(path.join(dir, name));
        return {
          name,
          ext: path.extname(name).slice(1),
          size: stat.size,
          updatedAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 30);
  } catch {
    return [];
  }
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
    const name = String(params.name || "pc").replace(/[^a-z0-9-_]/gi, "") || "pc";
    const output = runNode(cda, ["inventory", "--name", name, "--yes"]);
    return { ok: true, action, output };
  }
  if (action === "advisories") {
    if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
    const inv = String(params.inventory || "pc").replace(/[^a-z0-9-_]/gi, "") || "pc";
    const name = `${inv}-vulns`;
    const output = runNode(cda, ["advisories", "--inventory", inv, "--name", name, "--share-package-names"], 35000);
    return { ok: true, action, output };
  }
  if (action === "web") {
    if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
    const url = String(params.url || "").trim();
    if (!/^https?:\/\//i.test(url)) throw new Error("INVALID_URL");
    const output = runNode(cda, ["web", "--url", url, "--name", "site-check", "--authorized"], 25000);
    return { ok: true, action, output };
  }
  if (action === "git-staged") {
    if (params.consent !== true) throw new Error("CONSENT_REQUIRED");
    const targetRoot = params.root ? path.resolve(String(params.root)) : ROOT;
    const scopeOut = runNode(cda, ["scope", "--root", targetRoot, "--git-staged", "--name", "staged-ui"]);
    const approveOut = runNode(cda, ["approve", "--scope", "staged-ui", "--root", targetRoot, "--yes"]);
    const reviewOut = runNode(cda, ["review", "--scope", "staged-ui", "--name", "staged-review"]);
    return { ok: true, action, output: `${scopeOut}${approveOut}${reviewOut}` };
  }
  if (action === "dashboard") {
    const lang = params.lang === "en" ? "en" : "pl";
    const output = runNode(cda, ["dashboard", "--lang", lang]);
    return { ok: true, action, output };
  }
  throw new Error("UNSUPPORTED_ACTION");
}

function renderMiniUiHtml(token, initialLang = "pl") {
  return `<!doctype html>
<html lang="${initialLang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cyber Defense Agent v0.2 — Mini Interface & Agent Bridge</title>
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
      max-width: 1260px;
      margin: 28px auto 0;
      padding: 0 24px;
      display: grid;
      gap: 22px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
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
      font-size: 21px;
      letter-spacing: -0.03em;
      margin-bottom: 6px;
    }
    .sub {
      color: var(--muted);
      font-size: 13.5px;
      margin-bottom: 18px;
    }
    .agents-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .agent-pill {
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.02);
      cursor: pointer;
      transition: all 0.2s;
    }
    .agent-pill.active {
      border-color: var(--accent);
      background: rgba(52, 211, 153, 0.08);
    }
    .agent-pill strong {
      display: block;
      font-size: 14px;
    }
    .agent-pill small {
      font: 10.5px var(--mono);
      color: var(--muted);
    }
    .status-ok { color: #6ee7b7 !important; }
    .status-warn { color: var(--amber) !important; }
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
    select, input[type="text"] {
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
      padding: 14px;
      font: 12.5px/1.6 var(--mono);
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
      padding: 10px 16px;
      border-radius: 9px;
      font: 650 12.5px var(--sans);
      cursor: pointer;
      border: 1px solid transparent;
      transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
      text-decoration: none;
    }
    .btn-primary {
      background: linear-gradient(180deg, #34d399 0%, #10b981 100%);
      color: #03140d;
      border-color: rgba(167, 243, 208, 0.55);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 18px -4px rgba(16,185,129,0.4);
    }
    .btn-primary:hover { transform: translateY(-1px); }
    .btn-secondary {
      background: rgba(255,255,255,0.04);
      border-color: var(--line);
      color: var(--text);
    }
    .btn-secondary:hover {
      border-color: var(--line-emerald);
      background: rgba(52, 211, 153, 0.07);
    }
    .actions-list {
      display: grid;
      gap: 10px;
    }
    .action-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.02);
    }
    .action-item strong { font-size: 13.5px; display: block; }
    .action-item small { font-size: 11.5px; color: var(--muted); }
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
    .console {
      background: #05070b;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 16px;
      font: 12px/1.65 var(--mono);
      color: #a7f3d0;
      min-height: 210px;
      max-height: 360px;
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
    .footer-credit {
      text-align: center;
      margin-top: 28px;
      font-size: 12px;
      color: var(--muted);
    }
    .footer-credit a { color: var(--accent); font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="brand">
      <div class="brand-shield">🛡️</div>
      <div>
        <span>cyber<span style="color:#94a3b8;font-weight:400">defense</span> · mini interface</span>
        <small>AI EVOLUTION POLSKA · V0.2</small>
      </div>
    </div>
    <div class="topbar-right">
      <span class="badge" id="guard-badge">127.0.0.1 · TYLKO ODCZYT</span>
      <div class="lang-switch">
        <button type="button" id="lang-pl" class="active" onclick="setLang('pl')">PL</button>
        <button type="button" id="lang-en" onclick="setLang('en')">EN</button>
      </div>
    </div>
  </header>

  <main class="shell">
    <div class="grid-2">
      <!-- AGENT BRIDGE -->
      <section class="card">
        <span class="eyebrow" data-i18n="bridge_eyebrow">01 / INTEGRACJA Z AGENTAMI AI</span>
        <h2 data-i18n="bridge_title">Mostek Claude Code CLI & Codex CLI</h2>
        <p class="sub" data-i18n="bridge_sub">Wybierz swojego agenta i zadanie. Narzędzie przygotuje gotową komendę ze skillem lub uruchomi sesję.</p>

        <div class="agents-row" id="agents-row"></div>

        <div class="form-row">
          <div>
            <label for="mission-select" data-i18n="mission_label">Zadanie dla agenta</label>
            <select id="mission-select" onchange="refreshBridge()">
              <option value="demo">🚀 Szybkie Demo End-to-End</option>
              <option value="code">🔍 Audyt kodu i zależności projektu</option>
              <option value="pc">💻 Audyt tego komputera (OSV + CISA KEV)</option>
              <option value="web">🌐 Pasywny audyt strony WWW (HTTPS/CSP/TLS)</option>
              <option value="report">📄 Wygeneruj raport HTML/PDF + Dashboard</option>
            </select>
          </div>
          <div>
            <label for="target-input" data-i18n="target_label">Ścieżka projektu lub URL (opcjonalnie)</label>
            <input type="text" id="target-input" placeholder="np. ./ lub https://twoja-strona.pl" oninput="refreshBridge()" />
          </div>
        </div>

        <label data-i18n="prompt_label">Gotowa komenda terminala / Prompt skilla:</label>
        <div class="prompt-box" id="bridge-command"></div>

        <div class="btn-row">
          <button class="btn btn-primary" type="button" onclick="copyCommand('cli')">
            <span data-i18n="copy_cli">📋 Kopiuj komendę CLI</span>
          </button>
          <button class="btn btn-secondary" type="button" onclick="copyCommand('prompt')">
            <span data-i18n="copy_prompt">💬 Kopiuj sam prompt do czatu</span>
          </button>
          <button class="btn btn-secondary" type="button" onclick="launchAgentTerminal()">
            <span data-i18n="launch_agent">⚡ Otwórz sesję agenta w nowym oknie</span>
          </button>
        </div>
      </section>

      <!-- 1-CLICK LOCAL TOOLS -->
      <section class="card">
        <span class="eyebrow" data-i18n="tools_eyebrow">02 / LOKALNE NARZĘDZIA CLI</span>
        <h2 data-i18n="tools_title">Szybkie akcje (100% Read-Only)</h2>
        <p class="sub" data-i18n="tools_sub">Uruchom przegląd bezpośrednio z interfejsu. Kroki systemowe i sieciowe wymagają zaznaczenia zgody.</p>

        <label class="consent-bar">
          <input type="checkbox" id="consent-check" />
          <span data-i18n="consent_text">Wyrażam świadomą zgodę na wywołanie wybranej komendy tylko do odczytu (--yes / --authorized).</span>
        </label>

        <div class="actions-list">
          <div class="action-item">
            <div>
              <strong data-i18n="act_demo_t">🚀 Syntetyczne Demo (demo.mjs)</strong>
              <small data-i18n="act_demo_s">Bezpieczny test w katalogu tymczasowym + odświeżenie dashboardu</small>
            </div>
            <button class="btn btn-primary" type="button" onclick="runAction('demo')">Uruchom</button>
          </div>

          <div class="action-item">
            <div>
              <strong data-i18n="act_inv_t">💻 Inwentarz Komputera (inventory)</strong>
              <small data-i18n="act_inv_s">Zainstalowane programy i otwarte porty (wymaga zgody powyżej)</small>
            </div>
            <button class="btn btn-secondary" type="button" onclick="runAction('inventory')">Skanuj PC</button>
          </div>

          <div class="action-item">
            <div>
              <strong data-i18n="act_web_t">🌐 Pasywny Test Strony WWW (web)</strong>
              <small data-i18n="act_web_s">Używa adresu URL wpisanego po lewej stronie (wymaga zgody)</small>
            </div>
            <button class="btn btn-secondary" type="button" onclick="runAction('web')">Sprawdź URL</button>
          </div>

          <div class="action-item">
            <div>
              <strong data-i18n="act_dash_t">📊 Panel na Żywo (dashboard.html)</strong>
              <small data-i18n="act_dash_s">Buduje i otwiera wizualny panel wszystkich raportów</small>
            </div>
            <a class="btn btn-secondary" href="/report/dashboard.html" target="_blank">Otwórz Panel ↗</a>
          </div>
        </div>
      </section>
    </div>

    <!-- LIVE OUTPUT & REPORTS -->
    <section class="card">
      <span class="eyebrow" data-i18n="out_eyebrow">03 / KONSOLA WYNIKÓW I RAPORTY (.CDA/REPORTS)</span>
      <div class="console" id="console-out">Gotowy. Wybierz akcję powyżej lub skopiuj komendę dla Claude Code / Codex CLI.</div>
      <div class="reports-grid" id="reports-list"></div>
    </section>

    <div class="footer-credit">
      Cyber Defense Agent v0.2 · Stworzone przez <a href="https://github.com/aievolutionpl" target="_blank">AI Evolution Polska</a> · MIT Open Source
    </div>
  </main>

  <script>
    const TOKEN = ${JSON.stringify(token)};
    let state = { lang: ${JSON.stringify(initialLang)}, host: 'claude', agents: {}, bridge: {} };

    const dict = {
      pl: {
        guard: '127.0.0.1 · TYLKO ODCZYT',
        bridge_eyebrow: '01 / INTEGRACJA Z AGENTAMI AI',
        bridge_title: 'Mostek Claude Code CLI & Codex CLI',
        bridge_sub: 'Wybierz swojego agenta i zadanie. Narzędzie przygotuje gotową komendę ze skillem lub uruchomi sesję.',
        mission_label: 'Zadanie dla agenta',
        target_label: 'Ścieżka projektu lub URL (opcjonalnie)',
        prompt_label: 'Gotowa komenda terminala / Prompt skilla:',
        copy_cli: '📋 Kopiuj komendę CLI',
        copy_prompt: '💬 Kopiuj sam prompt do czatu',
        launch_agent: '⚡ Otwórz sesję agenta w nowym oknie',
        tools_eyebrow: '02 / LOKALNE NARZĘDZIA CLI',
        tools_title: 'Szybkie akcje (100% Read-Only)',
        tools_sub: 'Uruchom przegląd bezpośrednio z interfejsu. Kroki systemowe i sieciowe wymagają zaznaczenia zgody.',
        consent_text: 'Wyrażam świadomą zgodę na wywołanie wybranej komendy tylko do odczytu (--yes / --authorized).',
        out_eyebrow: '03 / KONSOLA WYNIKÓW I RAPORTY (.CDA/REPORTS)',
      },
      en: {
        guard: '127.0.0.1 · READ-ONLY GUARD',
        bridge_eyebrow: '01 / AI AGENT INTEGRATION',
        bridge_title: 'Claude Code CLI & Codex CLI Bridge',
        bridge_sub: 'Select your agent and mission. The bridge builds a ready-to-run skill command or launches a session.',
        mission_label: 'Agent mission',
        target_label: 'Project path or URL (optional)',
        prompt_label: 'Ready terminal command / Skill prompt:',
        copy_cli: '📋 Copy CLI command',
        copy_prompt: '💬 Copy chat prompt only',
        launch_agent: '⚡ Open agent session in terminal',
        tools_eyebrow: '02 / LOCAL CLI TOOLS',
        tools_title: 'Quick actions (100% Read-Only)',
        tools_sub: 'Run checks directly from this interface. System and web checks require the explicit consent toggle.',
        consent_text: 'I explicitly consent to run the selected read-only command (--yes / --authorized).',
        out_eyebrow: '03 / LIVE CONSOLE & REPORTS (.CDA/REPORTS)',
      }
    };

    function setLang(lang) {
      state.lang = lang;
      document.getElementById('lang-pl').classList.toggle('active', lang === 'pl');
      document.getElementById('lang-en').classList.toggle('active', lang === 'en');
      document.getElementById('guard-badge').textContent = dict[lang].guard;
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        if (dict[lang][k]) el.textContent = dict[lang][k];
      });
      refreshBridge();
    }

    async function loadStatus() {
      const res = await fetch('/api/status');
      const data = await res.json();
      state.agents = data.agents;
      renderAgents();
      renderReports(data.reports);
      refreshBridge();
    }

    function renderAgents() {
      const row = document.getElementById('agents-row');
      row.innerHTML = '';
      for (const [id, info] of Object.entries(state.agents)) {
        const div = document.createElement('div');
        div.className = 'agent-pill' + (state.host === id ? ' active' : '');
        div.onclick = () => { state.host = id; renderAgents(); refreshBridge(); };
        const statusText = info.installed
          ? (state.lang === 'pl' ? '✓ Wykryto CLI' : '✓ CLI detected')
          : (info.entryExists ? (state.lang === 'pl' ? '✓ Skill gotowy' : '✓ Skill ready') : '—');
        div.innerHTML = '<strong>' + info.name + '</strong><small class="' + (info.installed ? 'status-ok' : 'status-warn') + '">' + statusText + '</small>';
        row.appendChild(div);
      }
    }

    function renderReports(reports) {
      const box = document.getElementById('reports-list');
      box.innerHTML = '';
      (reports || []).forEach(r => {
        const a = document.createElement('a');
        a.className = 'report-chip';
        a.href = '/report/' + encodeURIComponent(r.name);
        a.target = '_blank';
        a.textContent = '📄 ' + r.name;
        box.appendChild(a);
      });
    }

    async function refreshBridge() {
      const mission = document.getElementById('mission-select').value;
      const target = document.getElementById('target-input').value;
      const res = await fetch('/api/bridge?host=' + encodeURIComponent(state.host) + '&mission=' + encodeURIComponent(mission) + '&target=' + encodeURIComponent(target) + '&lang=' + encodeURIComponent(state.lang));
      state.bridge = await res.json();
      document.getElementById('bridge-command').textContent = state.bridge.cliCommand + '\\n\\n# Prompt:\\n' + state.bridge.prompt;
    }

    async function copyCommand(kind) {
      const text = kind === 'cli' ? state.bridge.cliCommand : state.bridge.prompt;
      await navigator.clipboard.writeText(text);
      document.getElementById('console-out').textContent = (state.lang === 'pl' ? '✓ Skopiowano do schowka:\\n' : '✓ Copied to clipboard:\\n') + text;
    }

    async function launchAgentTerminal() {
      const out = document.getElementById('console-out');
      out.textContent = state.lang === 'pl' ? 'Uruchamianie sesji agenta...' : 'Launching agent session...';
      const res = await fetch('/api/launch-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cda-token': TOKEN },
        body: JSON.stringify({ host: state.host, mission: document.getElementById('mission-select').value, target: document.getElementById('target-input').value, lang: state.lang })
      });
      const data = await res.json();
      out.textContent = data.message || JSON.stringify(data, null, 2);
    }

    async function runAction(action) {
      const out = document.getElementById('console-out');
      const consent = document.getElementById('consent-check').checked;
      const url = document.getElementById('target-input').value;
      out.textContent = (state.lang === 'pl' ? '⏳ Wykonywanie: ' : '⏳ Running: ') + action + '...';
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cda-token': TOKEN },
        body: JSON.stringify({ action, consent, url, lang: state.lang })
      });
      const data = await res.json();
      out.textContent = data.ok ? data.output : ('❌ ' + (data.error || 'Error'));
      loadStatus();
    }

    loadStatus();
  </script>
</body>
</html>`;
}

/** Start the local Mini Interface server on 127.0.0.1. */
export async function startMiniUi({ port = 3109, lang = "pl", openBrowser = true } = {}) {
  const token = crypto.randomBytes(24).toString("hex");
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
      if (req.method === "GET" && url.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        res.end(renderMiniUiHtml(token, lang));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/status") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ agents: detectAgents(), reports: listReportsSummary() }));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/bridge") {
        const bridge = buildAgentBridge({
          host: url.searchParams.get("host") || "claude",
          mission: url.searchParams.get("mission") || "demo",
          target: url.searchParams.get("target") || "",
          lang: url.searchParams.get("lang") || lang,
        });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(bridge));
        return;
      }
      if (req.method === "GET" && url.pathname.startsWith("/report/")) {
        const name = path.basename(decodeURIComponent(url.pathname.slice("/report/".length)));
        const filePath = path.join(ROOT, ".cda", "reports", name);
        if (!fs.existsSync(filePath)) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Report not found. Run Demo or Dashboard first.");
          return;
        }
        const ext = path.extname(name).toLowerCase();
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
      if (req.method === "POST" && (url.pathname === "/api/run" || url.pathname === "/api/launch-agent")) {
        if (req.headers["x-cda-token"] !== token) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "INVALID_SESSION_TOKEN" }));
          return;
        }
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 16384) throw new Error("PAYLOAD_TOO_LARGE");
        }
        const payload = JSON.parse(body || "{}");
        if (url.pathname === "/api/launch-agent") {
          const bridge = buildAgentBridge(payload);
          const agents = detectAgents();
          const hostInfo = agents[bridge.host];
          const promptFile = path.join(ROOT, ".cda", `last-agent-prompt-${bridge.host}.txt`);
          fs.mkdirSync(path.dirname(promptFile), { recursive: true });
          fs.writeFileSync(promptFile, bridge.prompt, "utf8");
          if (hostInfo?.installed && process.platform === "win32") {
            const child = spawn("cmd.exe", ["/c", "start", "cmd.exe", "/k", `${bridge.bin}`], {
              cwd: ROOT,
              detached: true,
              stdio: "ignore",
            });
            child.unref();
          }
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(
            JSON.stringify({
              ok: true,
              message:
                payload.lang === "en"
                  ? `✓ Saved prompt to .cda/last-agent-prompt-${bridge.host}.txt\n${hostInfo?.installed ? `✓ Opened ${hostInfo.name} window in repository root.\n` : "ℹ️ CLI binary not in PATH — run in your agent terminal:\n"}\nCommand:\n${bridge.cliCommand}\n\nPrompt:\n${bridge.prompt}`
                  : `✓ Zapisano prompt w .cda/last-agent-prompt-${bridge.host}.txt\n${hostInfo?.installed ? `✓ Otwarto okno ${hostInfo.name} w katalogu repozytorium.\n` : "ℹ️ Plik wykonywalny CLI nie jest w PATH — wpisz w swoim terminalu agenta:\n"}\nKomenda:\n${bridge.cliCommand}\n\nPrompt:\n${bridge.prompt}`,
            }),
          );
          return;
        }
        const result = runBoundedAction(payload.action, payload);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(result));
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    } catch (error) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: error.message || "ACTION_FAILED" }));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  const url = `http://127.0.0.1:${port}/`;
  if (openBrowser && process.platform === "win32") {
    try {
      const child = spawn("cmd.exe", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true });
      child.unref();
    } catch { /* ignore browser open failure */ }
  }
  return { server, url, port, token };
}
