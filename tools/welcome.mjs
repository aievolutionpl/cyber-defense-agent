import { detectAgents, buildAgentBridge, runBoundedAction, startMiniUi, listReportsSummary } from "./ui.mjs";

/** Deterministic, metadata-free intake. Never reads a target or grants permission. */
export const intake = [
  {
    id: "experience",
    title: "01 / YOUR WORKSPACE",
    titlePl: "01 / TWOJE ŚRODOWISKO",
    explanation:
      "This is for experienced operators. You control host permissions and must have authorization to inspect the target. No warranty or security certification is provided.",
    explanationPl:
      "Narzędzie dla świadomych operatorów. Ty kontrolujesz uprawnienia hosta i musisz mieć prawo do badania zasobu. Wynik nie stanowi certyfikatu bezpieczeństwa.",
    question: "Where should we start?",
    questionPl: "Od czego zaczynamy?",
    options: [
      "I understand agent permissions and own the audit authorization",
      "Help me learn with the synthetic demo first",
    ],
    optionsPl: [
      "Rozumiem uprawnienia agenta i posiadam autoryzację do audytu",
      "Chcę najpierw poznać działanie na bezpiecznym demo",
    ],
  },
  {
    id: "goal",
    title: "02 / YOUR GOAL",
    titlePl: "02 / TWÓJ CEL OCHRONY",
    explanation:
      "The shipped tools are read-only. Each step that looks at this machine, asks the internet or touches a website needs your explicit flag.",
    explanationPl:
      "Narzędzia działają wyłącznie w trybie odczytu (Read-Only). Każdy krok badający komputer, bazy CVE lub stronę WWW wymaga Twojej jawnej flagi zgody.",
    question: "What are we protecting?",
    questionPl: "Co chcesz sprawdzić i zabezpieczyć?",
    options: [
      "Local code and configuration",
      "An existing JSON / SARIF report",
      "An isolated lab architecture",
      "This computer or server: installed software and known vulnerabilities",
      "A website I own or administer",
    ],
    optionsPl: [
      "Lokalny kod źródłowy, zależności i konfigurację projektu",
      "Istniejący raport skanera JSON / SARIF (Gitleaks, Trivy, Semgrep)",
      "Architekturę izolowanego środowiska testowego (lab)",
      "Ten komputer lub serwer: zainstalowane programy, porty i znane luki CVE",
      "Stronę lub aplikację WWW, którą administruję",
    ],
  },
  {
    id: "priority",
    title: "03 / YOUR OUTCOME",
    titlePl: "03 / OCZEKIWANY REZULTAT",
    explanation:
      "A finding is a signal to investigate. A missing result is not proof of a fix.",
    explanationPl:
      "Każde ustalenie zawiera zredagowany dowód. Sam brak alertu nie jest dowodem naprawy — liczy się retest.",
    question: "What do you need next?",
    questionPl: "Czego potrzebujesz w kolejnym kroku?",
    options: [
      "Review before release",
      "Prioritise existing findings",
      "Verify a proposed fix",
    ],
    optionsPl: [
      "Pełny przegląd przed publikacją / wdrożeniem",
      "Uporządkowanie priorytetów (P0–P3) z istniejących ustaleń",
      "Weryfikacja wdrożonej poprawki (Retest przed i po)",
    ],
  },
  {
    id: "sharing",
    title: "04 / YOUR DATA",
    titlePl: "04 / PRYWATNOŚĆ DANYCH",
    explanation:
      "The CLI calls no model. Only the advisories and web commands use the network, and only with your explicit flag. Your agent host may send conversation content to its provider. This answer is a preference, not permission to send data.",
    explanationPl:
      "Lokalne CLI nie wywołuje żadnego modelu AI. Sieci używają wyłącznie komendy advisories oraz web — zawsze po Twojej jawnej zgodzie.",
    question: "How should the agent handle private output?",
    questionPl: "Jak traktować wygenerowane raporty?",
    options: [
      "Keep report content local",
      "Ask before sharing a locally reviewed, redacted summary",
    ],
    optionsPl: [
      "Zachowaj pełną treść raportów wyłącznie lokalnie (.cda/reports/)",
      "Pytaj przed przekazaniem zredagowanego podsumowania do modelu",
    ],
  },
];

export function createPlan(answers, lang = "en") {
  if (
    !Array.isArray(answers) ||
    answers.length !== intake.length ||
    answers.some(
      (answer, i) => !Number.isInteger(answer) || !intake[i].options[answer],
    )
  )
    throw new Error("INVALID_INTAKE");
  const pl = lang === "pl";
  const [experience, goal, priority, sharing] = answers;
  const steps =
    experience === 1
      ? pl
        ? [
            "Uruchom node tools/demo.mjs w tym zaufanym repozytorium.",
            "Przejrzyj wygenerowane raporty Markdown w .cda/reports/ i porównaj confirmed_fixed oraz insufficient_data.",
            "Skonfiguruj uprawnienia swojego hosta agenta przed wskazaniem prywatnych plików.",
          ]
        : [
            "Run node tools/demo.mjs in this trusted repository.",
            "Inspect the generated Markdown locally. Learn the difference between a confirmed fix and insufficient data.",
            "Configure host permissions before selecting any private files.",
          ]
      : goal === 2
        ? pl
          ? [
              "Opisz własnymi słowami architekturę izolowanego labu i jego granice.",
              "Poproś skill o listę kontrolną izolacji, kontroli ruchu (egress) oraz warunków STOP.",
              "Aktywne testy sieciowe są niedostępne w tym narzędziu; zaplanuj je w osobnym, autoryzowanym środowisku.",
            ]
          : [
              "Describe the isolated lab and its authorized boundaries in your own words.",
              "Ask the skill for isolation, egress and STOP-condition guidance.",
              "Active network tests remain unavailable in this skill; plan them for a separate authorized runner.",
            ]
        : goal === 3
          ? pl
            ? [
                "Po wyrażeniu zgody na odczyt lokalny uruchom: node tools/cda.mjs inventory --name pc --yes (bez nazwy hosta i użytkownika).",
                "Jeśli zgadzasz się na wysłanie nazw i wersji pakietów do OSV.dev, uruchom: node tools/cda.mjs advisories --inventory pc --name pc-vulns --share-package-names.",
                "Przejrzyj lokalnie .cda/reports/pc-vulns.md. Aplikacje spoza repozytoriów pakietów wymagają weryfikacji u producenta.",
                "Zainstaluj aktualizacje oficjalnymi kanałami, zbierz nowy inwentarz i porównaj wynik.",
              ]
            : [
                "Agree to a read-only listing, then run node tools/cda.mjs inventory --name pc --yes. No hostname or user name is recorded.",
                "If you accept that package names and versions go to OSV.dev, run node tools/cda.mjs advisories --inventory pc --name pc-vulns --share-package-names.",
                "Review .cda/reports/pc-vulns.md locally. Software under manual lookup was not checked automatically.",
                "Apply updates yourself through official channels, collect a fresh inventory and compare.",
              ]
          : goal === 4
            ? pl
              ? [
                  "Potwierdź, że jesteś właścicielem lub administratorem wskazanego adresu URL.",
                  "Uruchom: node tools/cda.mjs web --url <https://twoja-strona.pl> --name site --authorized (wysyła tylko kilka pasywnych zapytań GET).",
                  "Przejrzyj lokalnie .cda/reports/site.md, wdróż zalecane nagłówki lub ustawienia TLS na serwerze i powtórz test.",
                ]
              : [
                  "Confirm that you own or are authorized to assess the exact URL.",
                  "Run node tools/cda.mjs web --url <https://your-site> --name site --authorized. It sends a few passive GET requests only.",
                  "Review .cda/reports/site.md locally, fix the headers or TLS settings in your hosting, then run the check again.",
                ]
            : pl
              ? [
                  "Wskaż katalog główny i dokładną listę plików względnych (np. node tools/cda.mjs scope --root . --git-staged --name audit).",
                  goal === 1
                    ? "Uwzględnij plik raportu oraz każdy powiązany plik źródłowy na liście dozwolonych plików."
                    : "Zacznij od najważniejszych plików manifestu (package.json) i konfiguracji.",
                  "Przejrzyj propozycję zakresu i jawnie ją zatwierdź (approve --yes) przed jakimkolwiek odczytem.",
                  priority === 2
                    ? "Wygeneruj raporty przed i po, a następnie uruchom retest; brak danych oznacza insufficient_data."
                    : "Uruchom przegląd lokalny (review) lub import, a następnie sprawdź dowód i proponowaną poprawkę.",
                ]
              : [
                  "Supply a canonical directory and exact relative files; do not scan to discover them.",
                  goal === 1
                    ? "Include the report and every referenced local file in the proposed allowlist."
                    : "Start with the smallest useful manifest or configuration file.",
                  "Review the scope proposal and explicitly approve it before content is read.",
                  priority === 2
                    ? "Create before/after reports and run a retest; missing evidence stays insufficient_data."
                    : "Run the local review or import, then inspect the evidence and suggested fix.",
                ];
  return {
    format: "cda.intake.v1",
    answers: Object.fromEntries(intake.map((q, i) => [q.id, answers[i]])),
    steps,
    sharing: sharing === 0 ? "local-only" : "ask-after-local-review",
    scopeApproved: false,
    targetRead: false,
    providerCalled: false,
  };
}

/** ANSI styling helpers for Pro Terminal UI. */
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  emerald: "\x1b[38;2;52;211;153m",
  mint: "\x1b[38;2;167;243;208m",
  cyan: "\x1b[38;2;56;189;248m",
  amber: "\x1b[38;2;251;191;36m",
  rose: "\x1b[38;2;251;113;133m",
  slate: "\x1b[38;2;148;163;184m",
  white: "\x1b[38;2;248;250;252m",
  bgCard: "\x1b[48;2;13;18;27m",
};

/** Injected I/O makes the real conversation testable without a terminal or model. */
export async function runWelcome({ ask, write, lang = "en", styled = false }) {
  const pl = lang === "pl";
  if (styled) {
    write(
      `\n${c.emerald}╭──────────────────────────────────────────────────────────────────────────╮${c.reset}\n` +
        `${c.emerald}│${c.reset}  🛡️  ${c.bold}${c.white}${pl ? "KREATOR PLANU AUDYTU (OPERATOR INTAKE)" : "CYBER DEFENSE AGENT / OPERATOR INTAKE"}${c.reset}                           ${c.emerald}│${c.reset}\n` +
        `${c.emerald}│${c.reset}  ${c.slate}${pl ? "Najpierw zgoda. 100% tylko do odczytu. Twarde dowody." : "Consent first. Read-only. Evidence."}${c.reset}                  ${c.emerald}│${c.reset}\n` +
        `${c.emerald}╰──────────────────────────────────────────────────────────────────────────╯${c.reset}\n` +
        `${c.dim}${pl ? "Wpisz q w dowolnym momencie, aby zakończyć. Żadne pliki nie są tu czytane." : "Type q at any step to stop. Nothing is approved or scanned here."}${c.reset}\n`,
    );
  } else {
    write(
      "\n+-----------------------------------------+\n| CYBER DEFENSE AGENT / OPERATOR INTAKE    |\n| Consent first. Read-only. Evidence.     |\n+-----------------------------------------+\nType q at any step to stop. Nothing is approved or scanned here.\n",
    );
  }

  const answers = [];
  for (const item of intake) {
    const title = pl ? item.titlePl : item.title;
    const explanation = pl ? item.explanationPl : item.explanation;
    const question = pl ? item.questionPl : item.question;
    const options = pl ? item.optionsPl : item.options;

    if (styled) {
      write(
        `\n${c.bold}${c.emerald}${title}${c.reset}\n${c.slate}${explanation}${c.reset}\n\n${c.bold}${c.white}${question}${c.reset}\n` +
          options.map((opt, i) => `  ${c.emerald}[${i + 1}]${c.reset} ${c.white}${opt}${c.reset}`).join("\n") +
          "\n",
      );
    } else {
      write(
        `\n${title}\n${explanation}\n\n${question}\n${options.map((option, i) => `  ${i + 1}. ${option}`).join("\n")}\n`,
      );
    }

    while (true) {
      const promptText = styled
        ? `${c.cyan}${pl ? "Wybierz numer (lub q): " : "Choose a number (or q): "}${c.reset}`
        : "Choose a number (or q): ";
      const value = (await ask(promptText))?.trim();
      if (value == null || /^q$/i.test(value)) {
        write(
          styled
            ? `\n${c.amber}${pl ? "Zatrzymano. Nie zatwierdzono zakresu ani nie odczytano żadnych plików." : "Stopped. No scope approval, target read or model call."}${c.reset}\n`
            : "\nStopped. No scope approval, target read or model call.\n",
        );
        return null;
      }
      if (/^[1-9]$/.test(value) && Number(value) <= options.length) {
        answers.push(Number(value) - 1);
        break;
      }
      write(
        styled
          ? `${c.rose}${pl ? "Wybierz jeden z wyświetlonych numerów lub wpisz q." : "Please choose one of the displayed numbers, or q."}${c.reset}\n`
          : "Please choose one of the displayed numbers, or q.\n",
      );
    }
  }
  const plan = createPlan(answers, lang);
  if (styled) {
    write(
      `\n${c.emerald}╭──────────────────────────────────────────────────────────────────────────╮${c.reset}\n` +
        `${c.emerald}│${c.reset}  ✅ ${c.bold}${c.white}${pl ? "TWÓJ PLAN DZIAŁANIA KROK PO KROKU" : "YOUR NEXT STEPS"}${c.reset}                                      ${c.emerald}│${c.reset}\n` +
        `${c.emerald}╰──────────────────────────────────────────────────────────────────────────╯${c.reset}\n` +
        plan.steps.map((step, i) => `  ${c.emerald}0${i + 1}.${c.reset} ${c.white}${step}${c.reset}`).join("\n") +
        `\n\n  ${c.slate}${pl ? "Preferencja danych:" : "Data preference:"}${c.reset} ${c.mint}${plan.sharing}${c.reset}\n` +
        `  ${c.dim}${pl ? "Zero odczytanych plików · Zero zmian · Odpowiedzi nie są zapisywane." : "No files read. No scope approved. No model called. Answers are not saved."}${c.reset}\n`,
    );
  } else {
    write(
      `\nYOUR NEXT STEPS\n${plan.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}\n\nData preference: ${plan.sharing}\nNo files read. No scope approved. No model called. Answers are not saved.\nOpen skills/cyber-defense/SKILL.md in your configured agent host to continue.\n`,
    );
  }
  return plan;
}

function renderBanner(lang, agents, reportsCount) {
  const pl = lang === "pl";
  const claudeBadge = agents.claude.installed
    ? `${c.emerald}● Claude Code CLI (${agents.claude.version})${c.reset}`
    : `${c.amber}○ Claude Code (.claude/ skill gotowy)${c.reset}`;
  const codexBadge = agents.codex.installed
    ? `${c.emerald}● Codex CLI (${agents.codex.version})${c.reset}`
    : `${c.amber}○ Codex CLI (.agents/ skill gotowy)${c.reset}`;

  return (
    `\n${c.emerald}╭────────────────────────────────────────────────────────────────────────────╮${c.reset}\n` +
    `${c.emerald}│${c.reset}  🛡️  ${c.bold}${c.white}CYBER DEFENSE AGENT v0.2${c.reset}  ·  ${c.mint}${pl ? "TERMINALOWE CENTRUM DOWODZENIA" : "OPERATOR COMMAND CENTER"}${c.reset}        ${c.emerald}│${c.reset}\n` +
    `${c.emerald}│${c.reset}  ${c.slate}AI Evolution Polska  ·  100% Read-Only  ·  OSV.dev + CISA KEV + SARIF${c.reset}     ${c.emerald}│${c.reset}\n` +
    `${c.emerald}├────────────────────────────────────────────────────────────────────────────┤${c.reset}\n` +
    `${c.emerald}│${c.reset}  ${c.slate}${pl ? "Wykryte agenty:" : "Detected agents:"}${c.reset} ${claudeBadge}  │  ${codexBadge}\n` +
    `${c.emerald}│${c.reset}  ${c.slate}${pl ? "Raporty lokalne (.cda/reports/):" : "Local reports (.cda/reports/):"}${c.reset} ${c.cyan}${reportsCount}${c.reset}  │  ${c.slate}${pl ? "Język:" : "Language:"}${c.reset} ${c.bold}${c.white}${pl ? "🇵🇱 POLSKI" : "🇬🇧 ENGLISH"}${c.reset}\n` +
    `${c.emerald}╰────────────────────────────────────────────────────────────────────────────╯${c.reset}\n`
  );
}

function renderMenu(lang) {
  const pl = lang === "pl";
  const items = pl
    ? [
        ["1", "🚀 Szybkie Demo Bezpieczeństwa (End-to-End)", "syntetyczny audyt + retest + dashboard"],
        ["2", "🤖 Mostek Agentów AI (Claude Code CLI / Codex CLI)", "generuj komendę skilla lub otwórz sesję CLI"],
        ["3", "🖥️  Uruchom Mini Interfejs Graficzny (Web GUI)", "lokalny panel http://127.0.0.1:3109 + Agent Bridge"],
        ["4", "💻 Audyt Tego Komputera (inventory + advisories)", "programy, otwarte porty oraz luki OSV.dev / CISA KEV"],
        ["5", "🌐 Pasywny Audyt Strony WWW (web)", "HTTPS, HSTS, CSP, flagi cookies, CORS i certyfikat TLS"],
        ["6", "🔍 Audyt Zmian Git (scope --git-staged + review)", "sprawdź pliki przygotowane do commita (8 reguł v0.2)"],
        ["7", "📊 Odśwież Panel Raportów (dashboard.html)", "generuje ciemny panel wszystkich ustaleń po polsku/angielsku"],
        ["8", "🧭 Kreator Planu Bezpieczeństwa (Operator Intake)", "4 pytania prowadzące do spersonalizowanego planu"],
        ["L", "🌐 Zmień język / Switch language (PL ↔ EN)", "przełącz między polskim a angielskim"],
        ["q", "🚪 Wyjdź z programu", "zakończ bez zmian w systemie"],
      ]
    : [
        ["1", "🚀 Quick Security Demo (End-to-End)", "synthetic audit + retest + live dashboard"],
        ["2", "🤖 AI Agent Bridge (Claude Code CLI / Codex CLI)", "build skill command or launch CLI session"],
        ["3", "🖥️  Launch Mini Web Interface (Local GUI)", "local http://127.0.0.1:3109 control center + Agent Bridge"],
        ["4", "💻 Audit This Computer (inventory + advisories)", "installed apps, open ports & OSV.dev / CISA KEV CVEs"],
        ["5", "🌐 Passive Website Audit (web)", "HTTPS, HSTS, CSP, cookies, CORS & TLS certificate"],
        ["6", "🔍 Git Staged Audit (scope --git-staged + review)", "inspect staged files with 8 local v0.2 security rules"],
        ["7", "📊 Refresh Live Dashboard (dashboard.html)", "build dark visual HTML dashboard from local reports"],
        ["8", "🧭 Guided Operator Intake (4-Step Plan)", "interactive questionnaire for a tailored audit plan"],
        ["L", "🌐 Switch language / Zmień język (EN ↔ PL)", "toggle between English and Polish"],
        ["q", "🚪 Quit", "exit cleanly"],
      ];

  return (
    `\n${c.bold}${c.white}${pl ? "WYBIERZ KOMENDĘ / OPERACJĘ:" : "CHOOSE A COMMAND / OPERATION:"}${c.reset}\n` +
    items
      .map(
        ([key, title, desc]) =>
          `  ${c.emerald}[${key}]${c.reset} ${c.bold}${c.white}${title.padEnd(50, " ")}${c.reset} ${c.dim}— ${desc}${c.reset}`,
      )
      .join("\n") +
    "\n"
  );
}

export async function welcomeTerminal(options = {}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error("INTERACTIVE_TERMINAL_REQUIRED");
  const { createInterface } = await import("node:readline/promises");
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  terminal.on("SIGINT", () => terminal.close());
  const write = (text) => process.stdout.write(text);
  const ask = (prompt) => terminal.question(prompt);

  try {
    let lang = options.lang === "en" ? "en" : options.lang === "pl" ? "pl" : null;
    if (!lang) {
      write(
        `\n${c.emerald}╭────────────────────────────────────────────────────────────────────────────╮${c.reset}\n` +
          `${c.emerald}│${c.reset}  🛡️  ${c.bold}${c.white}CYBER DEFENSE AGENT v0.2${c.reset}  ·  ${c.mint}AI EVOLUTION POLSKA${c.reset}                      ${c.emerald}│${c.reset}\n` +
          `${c.emerald}╰────────────────────────────────────────────────────────────────────────────╯${c.reset}\n` +
          `  ${c.emerald}[1]${c.reset} ${c.bold}${c.white}🇵🇱 Polski (Domyślny / Default — naciśnij Enter)${c.reset}\n` +
          `  ${c.cyan}[2]${c.reset} ${c.white}🇬🇧 English${c.reset}\n`,
      );
      const langChoice = (await ask(`\n${c.cyan}Wybierz język / Select language [1/2]: ${c.reset}`))?.trim();
      if (langChoice && /^q$/i.test(langChoice)) {
        write(`\n${c.amber}Do zobaczenia! / Goodbye!${c.reset}\n`);
        return;
      }
      lang = langChoice === "2" || /^en$/i.test(langChoice || "") ? "en" : "pl";
    }

    while (true) {
      const pl = lang === "pl";
      const agents = detectAgents();
      const reports = listReportsSummary();
      write(renderBanner(lang, agents, reports.length));
      write(renderMenu(lang));

      const choice = (
        await ask(`${c.cyan}${pl ? "Twój wybór [1-8, L, q]: " : "Your choice [1-8, L, q]: "}${c.reset}`)
      )?.trim();

      if (choice == null || /^q$/i.test(choice)) {
        write(
          `\n${c.emerald}✓ ${pl ? "Zakończono. Dziękujemy za korzystanie z Cyber Defense Agent (AI Evolution Polska)." : "Session closed. Built by AI Evolution Polska."}${c.reset}\n`,
        );
        break;
      }

      if (/^l$/i.test(choice)) {
        lang = lang === "pl" ? "en" : "pl";
        continue;
      }

      if (choice === "1") {
        write(`\n${c.emerald}⏳ ${pl ? "Uruchamianie syntetycznego demo bezpieczeństwa..." : "Running synthetic security demo..."}${c.reset}\n`);
        const res = runBoundedAction("demo", { lang });
        write(`\n${c.mint}${res.output}${c.reset}\n`);
        await ask(`\n${c.dim}${pl ? "Naciśnij Enter, aby wrócić do menu..." : "Press Enter to return to menu..."}${c.reset}`);
        continue;
      }

      if (choice === "2") {
        write(
          `\n${c.bold}${c.emerald}${pl ? "🤖 MOSTEK AGENTÓW AI (CLAUDE CODE CLI & CODEX CLI)" : "🤖 AI AGENT BRIDGE (CLAUDE CODE CLI & CODEX CLI)"}${c.reset}\n` +
            `  ${c.emerald}[1]${c.reset} ${c.white}Claude Code CLI (${agents.claude.installed ? "✓ zainstalowany" : ".claude/skills/cyber-defense"})${c.reset}\n` +
            `  ${c.emerald}[2]${c.reset} ${c.white}OpenAI Codex CLI (${agents.codex.installed ? "✓ zainstalowany" : ".agents/skills/cyber-defense"})${c.reset}\n`,
        );
        const hostPick = (await ask(`${c.cyan}${pl ? "Wybierz agenta [1=Claude, 2=Codex]: " : "Select agent [1=Claude, 2=Codex]: "}${c.reset}`))?.trim();
        const host = hostPick === "2" ? "codex" : "claude";

        write(
          `\n${c.bold}${c.white}${pl ? "Wybierz misję dla agenta:" : "Select mission for the agent:"}${c.reset}\n` +
            `  ${c.emerald}[1]${c.reset} ${pl ? "Szybkie Demo End-to-End" : "Quick End-to-End Demo"}\n` +
            `  ${c.emerald}[2]${c.reset} ${pl ? "Audyt kodu i zależności projektu" : "Project code & dependency audit"}\n` +
            `  ${c.emerald}[3]${c.reset} ${pl ? "Audyt tego komputera (programy, porty, luki CVE)" : "Computer & CVE audit (OSV + CISA KEV)"}\n` +
            `  ${c.emerald}[4]${c.reset} ${pl ? "Pasywny audyt strony WWW (HTTPS/CSP/TLS)" : "Passive website audit (HTTPS/CSP/TLS)"}\n` +
            `  ${c.emerald}[5]${c.reset} ${pl ? "Raport wizualny HTML / PDF + Dashboard" : "Visual HTML / PDF report + Dashboard"}\n`,
        );
        const mPick = (await ask(`${c.cyan}${pl ? "Wybierz misję [1-5]: " : "Select mission [1-5]: "}${c.reset}`))?.trim();
        const mMap = { "1": "demo", "2": "code", "3": "pc", "4": "web", "5": "report" };
        const mission = mMap[mPick] || "demo";
        let target = "";
        if (mission === "code" || mission === "web") {
          target = (
            await ask(
              `${c.cyan}${pl ? "Podaj ścieżkę lub adres URL (Enter = domyślny): " : "Enter path or URL (Enter = default): "}${c.reset}`,
            )
          )?.trim() || "";
        }
        const bridge = buildAgentBridge({ host, mission, target, lang, executablePath: agents[host].commandPath, executableArgs: agents[host].commandArgs });
        write(
          `\n${c.emerald}╭─── ${pl ? "GOTOWA KOMENDA I PROMPT AGENTA" : "READY AGENT COMMAND & PROMPT"} ───────────────────────────────────────╮${c.reset}\n` +
            `  ${c.slate}${pl ? "Komenda CLI:" : "CLI Command:"}${c.reset}\n  ${c.bold}${c.mint}${bridge.cliCommand}${c.reset}\n\n` +
            `  ${c.slate}${pl ? "Wklej bezpośrednio w czacie agenta:" : "Paste directly inside the agent chat:"}${c.reset}\n  ${c.white}${bridge.prompt}${c.reset}\n` +
            `${c.emerald}╰────────────────────────────────────────────────────────────────────────────╯${c.reset}\n`,
        );
        await ask(`\n${c.dim}${pl ? "Naciśnij Enter, aby wrócić do menu..." : "Press Enter to return to menu..."}${c.reset}`);
        continue;
      }

      if (choice === "3") {
        const ui = await startMiniUi({ port: 3109, lang, openBrowser: true });
        write(
          `\n${c.emerald}╭────────────────────────────────────────────────────────────────────────────╮${c.reset}\n` +
            `${c.emerald}│${c.reset}  🖥️  ${c.bold}${c.white}${pl ? "MINI INTERFEJS URUCHOMIONY!" : "MINI WEB INTERFACE RUNNING!"}${c.reset}                                       ${c.emerald}│${c.reset}\n` +
            `${c.emerald}│${c.reset}  🌐 URL: ${c.bold}${c.cyan}${ui.url}${c.reset}                                          ${c.emerald}│${c.reset}\n` +
            `${c.emerald}│${c.reset}  🔒 ${c.slate}${pl ? "Dostępny wyłącznie lokalnie (127.0.0.1) z tokenem sesji." : "Bound strictly to 127.0.0.1 with ephemeral session token."}${c.reset}       ${c.emerald}│${c.reset}\n` +
            `${c.emerald}╰────────────────────────────────────────────────────────────────────────────╯${c.reset}\n`,
        );
        await ask(`\n${c.amber}${pl ? "Naciśnij Enter, aby zamknąć serwer Mini UI i wrócić do menu..." : "Press Enter to stop the Mini UI server and return to menu..."}${c.reset}`);
        ui.server.close();
        continue;
      }

      if (choice === "4") {
        const ok = (
          await ask(
            `\n${c.amber}${pl ? "Czy wyrażasz zgodę na odczyt zainstalowanych programów i portów (--yes)? [t/N]: " : "Do you consent to read installed software and open ports (--yes)? [y/N]: "}${c.reset}`,
          )
        )?.trim();
        if (/^(t|tak|y|yes)$/i.test(ok || "")) {
          write(`\n${c.emerald}⏳ ${pl ? "Zbieranie inwentarza systemu..." : "Collecting machine inventory..."}${c.reset}\n`);
          const inv = runBoundedAction("inventory", { consent: true, name: "pc" });
          write(`${c.mint}${inv.output}${c.reset}\n`);
          const askOsv = (
            await ask(
              `\n${c.amber}${pl ? "Czy sprawdzić znane luki w OSV.dev + CISA KEV (--share-package-names)? [t/N]: " : "Check known vulnerabilities in OSV.dev + CISA KEV (--share-package-names)? [y/N]: "}${c.reset}`,
            )
          )?.trim();
          if (/^(t|tak|y|yes)$/i.test(askOsv || "")) {
            write(`\n${c.emerald}⏳ ${pl ? "Sprawdzanie baz OSV.dev oraz CISA KEV..." : "Querying OSV.dev and CISA KEV..."}${c.reset}\n`);
            const adv = runBoundedAction("advisories", { consent: true, inventory: "pc" });
            write(`${c.mint}${adv.output}${c.reset}\n`);
          }
        } else {
          write(`\n${c.slate}${pl ? "Anulowano — brak zgody." : "Cancelled — consent not granted."}${c.reset}\n`);
        }
        await ask(`\n${c.dim}${pl ? "Naciśnij Enter, aby wrócić do menu..." : "Press Enter to return to menu..."}${c.reset}`);
        continue;
      }

      if (choice === "5") {
        const url = (
          await ask(`${c.cyan}${pl ? "Podaj adres URL swojej strony (np. https://example.com): " : "Enter your website URL (e.g. https://example.com): "}${c.reset}`)
        )?.trim();
        if (url) {
          const ok = (
            await ask(
              `${c.amber}${pl ? `Potwierdzasz uprawnienia do pasywnego testu ${url} (--authorized)? [t/N]: ` : `Confirm authorization to passively check ${url} (--authorized)? [y/N]: `}${c.reset}`,
            )
          )?.trim();
          if (/^(t|tak|y|yes)$/i.test(ok || "")) {
            try {
              write(`\n${c.emerald}⏳ ${pl ? "Wykonywanie pasywnego testu HTTP/TLS..." : "Running passive HTTP/TLS check..."}${c.reset}\n`);
              const res = runBoundedAction("web", { consent: true, url });
              write(`${c.mint}${res.output}${c.reset}\n`);
            } catch (err) {
              write(`${c.rose}❌ ${err.message}${c.reset}\n`);
            }
          }
        }
        await ask(`\n${c.dim}${pl ? "Naciśnij Enter, aby wrócić do menu..." : "Press Enter to return to menu..."}${c.reset}`);
        continue;
      }

      if (choice === "6") {
        const ok = (
          await ask(
            `\n${c.amber}${pl ? "Przygotować propozycję zakresu dla plików Git staged? [t/N] " : "Prepare a scope proposal for staged Git files? [y/N] "}${c.reset}`,
          )
        )?.trim();
        if (/^(t|tak|y|yes)$/i.test(ok || "")) {
          try {
            const res = runBoundedAction("git-staged", { consent: true });
            write(`\n${c.mint}${res.output}${c.reset}\n`);
            const approval = (await ask(pl ? "Zatwierdzasz odczyt tej dokładnej listy plików? [t/N] " : "Approve reading this exact file list? [y/N] "))?.trim();
            if (/^(t|tak|y|yes)$/i.test(approval || "")) {
              const reviewed = runBoundedAction("review-staged", { consent: true, scopeName: res.scopeName, proposalDigest: res.proposalDigest });
              write(`\n${c.mint}${reviewed.output}${c.reset}\n`);
            }
          } catch (err) {
            write(`\n${c.rose}❌ ${err.message}${c.reset}\n`);
          }
        }
        await ask(`\n${c.dim}${pl ? "Naciśnij Enter, aby wrócić do menu..." : "Press Enter to return to menu..."}${c.reset}`);
        continue;
      }

      if (choice === "7") {
        const res = runBoundedAction("dashboard", { lang });
        write(`\n${c.mint}${res.output}${c.reset}\n`);
        await ask(`\n${c.dim}${pl ? "Naciśnij Enter, aby wrócić do menu..." : "Press Enter to return to menu..."}${c.reset}`);
        continue;
      }

      if (choice === "8") {
        await runWelcome({ ask, write, lang, styled: true });
        await ask(`\n${c.dim}${pl ? "Naciśnij Enter, aby wrócić do menu..." : "Press Enter to return to menu..."}${c.reset}`);
        continue;
      }

      write(`${c.rose}${pl ? "Nieznana opcja. Wybierz 1-8, L lub q." : "Unknown option. Choose 1-8, L or q."}${c.reset}\n`);
    }
  } catch (error) {
    if (error.code !== "ERR_USE_AFTER_CLOSE") throw error;
  } finally {
    terminal.close();
  }
}
