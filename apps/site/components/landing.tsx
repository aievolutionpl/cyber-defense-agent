import { HostWorkflows } from "./host-workflows";
import { ProtectionMap } from "./protection-map";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  FileCheck2,
  FileCode2,
  Fingerprint,
  GitBranch,
  Globe,
  Layers3,
  LockKeyhole,
  Monitor,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Navigation } from "./navigation";
import { ReportPreview } from "./report-preview";
import { GuidedDemo } from "./guided-demo";
import { Installation } from "./installation";
import { TrustSection } from "./trust-section";
import { Onboarding } from "./onboarding";
import { AgentBuildScroll } from "./motion-system";
import { HeroSignal } from "./hero-signal";
import { Missions } from "./missions";
import { LiveSession } from "./live-session";
import { SkillCompare, ConsentLadder, KnowledgeBase } from "./skill-story";
import { ExpertEffects } from "./expert-effects";
import { ScanTheater } from "./scan-theater";
import { ReportShowcase } from "./report-showcase";
import { GitHubLink, Mark } from "./ui";
import { asset, github, type Locale } from "@/lib/config";

export function Landing({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const start = pl ? "Zacznij na GitHubie" : "Start on GitHub";
  const faq = pl
    ? [
        [
          "Co dokładnie potrafi agent z tym skillem?",
          "Sprawdza komputer lub serwer (zainstalowane programy, znane luki, otwarte porty, plan aktualizacji), stronę WWW (HTTPS, nagłówki, ciasteczka, CORS, certyfikat), projekt (podatne zależności, sekrety, ryzykowny kod, raporty skanerów), bazę danych i sieć według playbooków, a przy podejrzeniu włamania prowadzi przez pierwsze kroki. Wszystko w trybie odczytu, z dowodem i retestem.",
        ],
        [
          "Co dostaję po audycie?",
          "Ciemny, wizualny raport w HTML i PDF: werdykt, wykres priorytetów, trzy rzeczy na start, każde ustalenie z dowodem, poprawką i sposobem sprawdzenia oraz pomysły, co warto dopracować. Dostajesz go, zanim zacznie się naprawianie. PDF powstaje lokalnie przez zainstalowaną przeglądarkę Edge, Chrome lub Chromium; bez niej dostajesz HTML do wydrukowania. Do tego panel dashboard.html, który odświeża się sam, gdy agent pracuje.",
        ],
        [
          "Czy muszę znać się na bezpieczeństwie?",
          "Nie. Agent dopasowuje język do Ciebie: najpierw mówi, co może się stać i co zrobić, a identyfikatory (CVE, CWE) podaje na końcu. Jeśli jesteś specjalistą, dostaniesz zwięzłą wersję z pokryciem i założeniami.",
        ],
        [
          "Co opuszcza mój komputer?",
          "Domyślnie nic. Polecenie advisories wysyła do OSV.dev wyłącznie nazwy i wersje pakietów oraz pobiera publiczną listę CISA KEV. Polecenie web wysyła kilka zwykłych zapytań GET do strony, którą wskażesz. Oba wymagają jawnej flagi po Twojej zgodzie. Host agenta (Codex, Claude Code) może przekazać dostawcy modelu treść rozmowy, więc raporty najpierw przeglądasz lokalnie.",
        ],
        [
          "Czy agent coś zmienia albo instaluje?",
          "Nie. Narzędzia tylko czytają. Agent przygotowuje dokładną poprawkę, sposób jej cofnięcia i test, a zmianę wdrażasz Ty. Nie uruchamia kodu Twojego projektu, nie instaluje aktualizacji i nie restartuje usług.",
        ],
        [
          "Czy to zastąpi pentest albo antywirusa?",
          "Nie. To pasywne, defensywne kontrole i wiedza ekspercka, a nie test penetracyjny, EDR czy certyfikat. Automatyczne sprawdzanie luk obejmuje pakiety systemowe Linuksa i zależności projektów; aplikacje desktopowe Windows i macOS agent bada w źródłach producenta. Brak ustaleń nie oznacza, że system jest bezpieczny.",
        ],
        [
          "Czy mogę sprawdzić cudzą stronę albo sieć?",
          "Nie. Skill działa tylko na zasobach, które należą do Ciebie lub którymi administrujesz. Nie atakuje, nie zgaduje haseł, nie skanuje portów i nie ukrywa swoich działań. Aktywne testy pozostają w roadmapie i wymagają osobnego, autoryzowanego środowiska.",
        ],
        [
          "Z jakimi agentami działa i ile kosztuje?",
          "Skill ma punkty wejścia dla Codex i Claude Code, zgodny format dla Cursor i Antigravity oraz eksperymentalny dla Hermes. Narzędzia i kontrakt instrukcji są przetestowane; pełne sesje z modelami pozostają niezweryfikowane. Kod jest na licencji MIT: wymaga Node.js 22+ i Git, bez konta i opłat. Dostęp do modelu rozliczasz osobno u dostawcy.",
        ],
      ]
    : [
        [
          "What exactly can my agent do with this skill?",
          "Check a computer or server (installed software, known vulnerabilities, open ports, an update plan), a website (HTTPS, headers, cookies, CORS, certificate), a project (vulnerable dependencies, secrets, risky code, scanner reports), a database and a network by playbook, and guide the first steps when a break-in is suspected. All read-only, with evidence and a retest.",
        ],
        [
          "What do I get after an audit?",
          "A dark, visual report in HTML and PDF: the verdict, a priority chart, the three things to start with, every finding with evidence, fix and verification, and ideas worth improving. You get it before any fixing starts. The PDF is produced locally by an installed Edge, Chrome or Chromium; without one you get the HTML to print. Plus a dashboard.html that refreshes itself while the agent works.",
        ],
        [
          "Do I need to know security?",
          "No. The agent matches your level: it leads with what could happen and what to do, and puts identifiers (CVE, CWE) last. If you are a specialist you get the terse version with coverage and assumptions.",
        ],
        [
          "What leaves my machine?",
          "Nothing by default. The advisories command sends only package names and versions to OSV.dev and downloads the public CISA KEV list. The web command sends a few ordinary GET requests to the site you name. Both need an explicit flag after you agree. Your agent host (Codex, Claude Code) may share conversation content with its model provider, so you review reports locally first.",
        ],
        [
          "Will the agent change or install anything?",
          "No. The tools only read. The agent prepares the exact fix, its rollback and the test; you apply the change. It never runs your project's code, installs updates or restarts services.",
        ],
        [
          "Does this replace a pentest or antivirus?",
          "No. These are passive, defensive checks and expert knowledge, not a penetration test, EDR or certification. Automatic vulnerability lookup covers Linux system packages and project dependencies; Windows and macOS desktop apps are researched at the vendor's sources. No findings does not mean a system is secure.",
        ],
        [
          "Can I check someone else's website or network?",
          "No. The skill works only on assets you own or administer. It does not attack, guess passwords, scan ports or hide what it does. Active testing stays on the roadmap and needs a separate, authorized environment.",
        ],
        [
          "Which agents does it work with, and what does it cost?",
          "The skill ships entry points for Codex and Claude Code, a compatible format for Cursor and Antigravity, and an experimental one for Hermes. The tools and the instruction contract are tested; full model sessions remain unverified. The code is MIT licensed: Node.js 22+ and Git, no account, no fee. Model access is billed separately by your provider.",
        ],
      ];
  const capabilities = (
    [
      [Monitor, ["Knows what is installed.", "Wie, co masz zainstalowane."], ["Programs and listening ports on Windows, macOS and Linux, through fixed read-only system queries. No computer name, no user name.", "Programy i nasłuchujące porty na Windows, macOS i Linuksie, stałymi zapytaniami tylko do odczytu. Bez nazwy komputera i użytkownika."], ["inventory --name pc --yes", "packages: 1412", "ports: 22, 5432"]],
      [ShieldAlert, ["Knows what is vulnerable.", "Wie, co jest dziurawe."], ["OSV.dev plus the CISA list of flaws exploited in the wild. CVSS scores, fixed versions, and an honest list of what was not checked.", "OSV.dev i lista CISA luk wykorzystywanych w atakach. Ocena CVSS, wersje z poprawką i uczciwa lista tego, czego nie sprawdzono."], ["advisories --share-package-names", "P0 · exploited in the wild", "fixed in: 4.17.21"]],
      [Globe, ["Checks a site like a browser.", "Sprawdza stronę jak przeglądarka."], ["Three ordinary requests and one TLS handshake. HSTS, CSP, cookies, CORS, disclosure, certificate. No crawling, no payloads.", "Trzy zwykłe zapytania i jedno połączenie TLS. HSTS, CSP, ciasteczka, CORS, ujawnione wersje, certyfikat. Bez crawlowania i ładunków."], ["web --url … --authorized", "WEB-CSP-001 · P2", "requests: 3"]],
      [FileCode2, ["Code. Configuration. Clarity.", "Kod. Konfiguracja. Konkret."], ["Dependencies from six lockfile formats, four transparent local rules, and the location, redacted evidence and fix for every finding.", "Zależności z sześciu formatów lockfile, cztery jawne reguły lokalne oraz lokalizacja, zredagowany dowód i poprawka dla każdego ustalenia."], ["deps --input package-lock.json", "CDA-SECRET-001  secrets", "CDA-TLS-001  TLS verification"]],
      [Layers3, ["Turns reports into decisions.", "Z raportów robi decyzje."], ["Semgrep, Trivy or Gitleaks output as SARIF 2.1.0 or JSON becomes one deduplicated, prioritised Markdown report, without raw scanner text.", "Wynik Semgrep, Trivy lub Gitleaks w SARIF 2.1.0 albo JSON staje się jednym raportem Markdown: bez duplikatów, z priorytetami, bez surowej treści skanera."], ["JSON / SARIF", "↓ normalize + redact", "audit.md"]],
      [FileCheck2, ["Every fix needs evidence.", "Poprawka potrzebuje dowodu."], ["Compare before and after. A confirmed fix, a remaining signal or insufficient data. No guessing.", "Porównanie przed i po. Potwierdzona poprawka, nadal obecny sygnał albo brak danych. Zero zgadywania."], ["confirmed_fixed", "still_present", "insufficient_data"]],
    ] as const
  ).map(([icon, title, text, code]) => ({ icon, title: title[pl ? 1 : 0], text: text[pl ? 1 : 0], code }));
  const stats: [number, string][] = pl
    ? [[9, "playbooków eksperckich"], [6, "obszarów ochrony"], [54, "testy bezpieczeństwa narzędzi"], [0, "zmian bez Twojej zgody"]]
    : [[9, "expert playbooks"], [6, "areas of protection"], [54, "tool security tests"], [0, "changes without your consent"]];
  return (
    <>
      <a className="skip-link" href="#main">
        {pl ? "Przejdź do treści" : "Skip to content"}
      </a>
      <Navigation locale={locale} />
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-grid section-shell">
            <div
              className="hero-copy"
              data-agent-target="Builder"
              data-agent-label={
                pl ? "Budowanie systemu obrony" : "Building your defense"
              }
            >
              <div className="eyebrow hero-eyebrow">
                <span className="status-dot" />
                {pl
                  ? "SKILL DLA AGENTÓW AI · V0.2 · OPEN SOURCE"
                  : "A SKILL FOR AI AGENTS · V0.2 · OPEN SOURCE"}
              </div>
              <h1 id="hero-title">
                {pl ? (
                  <>
                    Twój agent AI
                    <br />
                    <span>ekspertem od bezpieczeństwa.</span>
                  </>
                ) : (
                  <>
                    Your AI agent,
                    <br />
                    <span>now a security expert.</span>
                  </>
                )}
              </h1>
              <p className="hero-description">
                {pl
                  ? "Jeden skill uczy Twojego agenta sprawdzać komputer, stronę, kod, bazę danych i sieć. Znajduje luki, tłumaczy je po ludzku, mówi, co zaktualizować, i udowadnia, że poprawka działa. O każdy krok pyta Cię o zgodę."
                  : "One skill teaches your agent to check your computer, website, code, database and network. It finds the gaps, explains them in plain language, tells you what to update and proves the fix works. It asks before every step."}
              </p>
              <div className="hero-ctas">
                <GitHubLink>{start}</GitHubLink>
                <a href="#live" className="button button-secondary">
                  {pl ? "Zobacz, jak pracuje" : "Watch it work"}
                  <ArrowDown size={16} />
                </a>
              </div>
              <div className="hero-assurance">
                <LockKeyhole size={14} />
                {pl
                  ? "Tylko odczyt. Zgoda przed każdym krokiem. Raport PDF po każdym audycie. 0 zł."
                  : "Read-only. Consent before every step. A PDF report after every audit. Free."}
              </div>
              <div className="hero-terminal">
                <span className="terminal-prompt">$</span>
                <code>node tools/demo.mjs</code>
                <span className="terminal-caret" aria-hidden="true" />
              </div>
            </div>
            <div className="hero-product">
              <HeroSignal locale={locale} />
            </div>
          </div>
          <dl className="hero-stats section-shell">
            {stats.map(([value, label]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd data-count={value}>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="hero-foot section-shell">
            <span className="mono">V0.2 / OPEN SOURCE</span>
            <a href="#workflow">
              {pl
                ? "PRZEWIŃ. ZOBACZ, JAK POWSTAJE SYSTEM."
                : "SCROLL. WATCH THE SYSTEM COME TOGETHER."}
              <ArrowDown size={13} />
            </a>
            <span className="mono">BUILT FOR EVIDENCE</span>
          </div>
        </section>
        <HostWorkflows locale={locale} />
        <ScanTheater locale={locale} />
        <Missions locale={locale} />
        <ReportShowcase locale={locale} />
        <LiveSession locale={locale} />
        <section className="workflow-section section-shell" id="workflow">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                01 / {pl ? "JAK TO DZIAŁA" : "THE WORKFLOW"}
              </span>
              <h2>
                {pl ? (
                  <>
                    Od pytania
                    <br />
                    do pewniejszej decyzji.
                  </>
                ) : (
                  <>
                    From an open question
                    <br />
                    to a clear next move.
                  </>
                )}
              </h2>
            </div>
            <p>
              {pl
                ? "Agent prowadzi. Ty zatwierdzasz każdy krok. Każda decyzja ma ślad w dowodach."
                : "The agent guides. You approve every step. Every decision has an evidence trail."}
            </p>
          </div>
          <div className="evidence-preview">
            <div className="evidence-intro">
              <span className="eyebrow">
                {pl
                  ? "ZA KAŻDYM SYGNAŁEM — DOWÓD"
                  : "BEHIND EVERY SIGNAL — EVIDENCE"}
              </span>
              <h3>{pl ? "Zajrzyj do raportu." : "Look inside the report."}</h3>
              <p>
                {pl
                  ? "Zakres, ustalenie i retest. Przejdź przez trzy zakładki przykładowego audytu i zobacz, co stoi za każdą decyzją."
                  : "Scope, finding, retest. Explore the three tabs of a sample audit and see what supports each decision."}
              </p>
              <a className="subtle-link" href="#demo">
                {pl ? "Przejdź przez pełne demo" : "Walk through the full demo"}
                <ArrowRight size={16} />
              </a>
            </div>
            <ReportPreview locale={locale} />
          </div>
          <div className="steps-grid">
            {(pl
              ? [
                  [
                    "Otwórz swój warsztat.",
                    "Sklonuj repo i wywołaj skill w Codex lub Claude Code. Powiedz, co chcesz chronić.",
                  ],
                  [
                    "Wyznacz granice.",
                    "Zatwierdź dokładne pliki, przegląd komputera albo adres strony. Nic nie dzieje się domyślnie.",
                  ],
                  [
                    "Raport, poprawka, retest.",
                    "Dostajesz raport PDF, zanim cokolwiek naprawisz. Po poprawce retest potwierdza ją albo uczciwie wskazuje brak danych.",
                  ],
                ]
              : [
                  [
                    "Open your workspace.",
                    "Clone the repo and invoke the skill in Codex or Claude Code. Say what you want to protect.",
                  ],
                  [
                    "Draw the boundaries.",
                    "Approve exact files, a look at the machine or a site address. Nothing happens by default.",
                  ],
                  [
                    "Report. Fix. Verify.",
                    "You get a PDF report before fixing anything. After the fix, the retest confirms it or honestly shows where data is missing.",
                  ],
                ]
            ).map(([title, text], i) => (
              <article
                key={title}
                data-agent-target={["Scout", "Builder", "Verifier"][i]}
              >
                <div className="step-line">
                  <span>0{i + 1}</span>
                  {i < 2 ? <ArrowRight size={18} /> : <Check size={18} />}
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <SkillCompare locale={locale} />
        <ProtectionMap locale={locale} />
        <section className="operations-section section-shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                02 / {pl ? "PANEL OBROŃCY" : "DEFENSE, MADE VISIBLE"}
              </span>
              <h2>
                {pl ? (
                  <>
                    Każdy sygnał.
                    <br />
                    Pełen kontekst.
                  </>
                ) : (
                  <>
                    Every signal.
                    <br />
                    The full picture.
                  </>
                )}
              </h2>
            </div>
            <p>
              {pl
                ? "Tak wygląda droga jednego ustalenia. Wszystkie wartości dotyczą wyłącznie scenariusza demo."
                : "Follow a single finding through the workflow. All values refer only to this demo scenario."}
            </p>
          </div>
          <div
            className="operations-board"
            data-agent-target="Verifier"
            data-agent-label={
              pl ? "Składanie obrazu ryzyka" : "Connecting the evidence"
            }
          >
            <div className="operations-top">
              <span>
                <ShieldCheck size={16} />
                DEFENSE OVERVIEW
              </span>
              <span className="demo-tag">
                {pl ? "DEMO / DANE STATYCZNE" : "DEMO / STATIC DATA"}
              </span>
            </div>
            <div className="metric-grid">
              {(pl
                ? [
                    ["01", "Wysoki priorytet przed poprawką"],
                    ["03", "Pliki w zatwierdzonym zakresie"],
                    ["01", "Potwierdzona poprawka"],
                    ["1/1", "Powtórzone kontrole demo"],
                  ]
                : [
                    ["01", "High priority before remediation"],
                    ["03", "Files in approved scope"],
                    ["01", "Confirmed fix"],
                    ["1/1", "Demo checks repeated"],
                  ]
              ).map(([value, label], i) => (
                <div key={label} className={`metric metric-${i}`}>
                  <span className="metric-label">{label}</span>
                  <strong>{value}</strong>
                  <span className="metric-detail">
                    {
                      [
                        "P1 / CDA-DEP-001",
                        "EXPLICIT ALLOWLIST",
                        "confirmed_fixed",
                        "LOCAL RULE / DIGEST",
                      ][i]
                    }
                  </span>
                </div>
              ))}
            </div>
            <div className="operations-charts">
              <div className="trend-chart">
                <div className="chart-title">
                  <h3>
                    {pl ? "Od ustalenia do poprawki" : "From finding to fix"}
                  </h3>
                  <span className="mono">01 → 00</span>
                </div>
                <div className="chart-legend">
                  <span>
                    <i />
                    {pl ? "Otwarte ustalenia" : "Open findings"}
                  </span>
                  <span>
                    <i />
                    {pl ? "Potwierdzone poprawki" : "Confirmed fixes"}
                  </span>
                </div>
                <svg
                  viewBox="0 0 640 180"
                  role="img"
                  aria-label={
                    pl
                      ? "Demo: jedno otwarte ustalenie przed poprawką, zero po lokalnym reteście; jedna potwierdzona poprawka."
                      : "Demo: one open finding before remediation, zero after a local retest; one confirmed fix."
                  }
                >
                  <defs>
                    <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#b2f1d2" stopOpacity=".13" />
                      <stop offset="1" stopColor="#b2f1d2" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <g stroke="#ffffff0d" strokeDasharray="3 6">
                    <path d="M30 30H610M30 90H610M30 150H610" />
                  </g>
                  <path
                    d="M30 150 200 150C280 150 320 30 420 30H610V175H30Z"
                    fill="url(#chart-fill)"
                  />
                  <path
                    className="chart-line"
                    d="M30 30H200C280 30 320 150 420 150H610"
                    stroke="#c3b591"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    className="chart-line secondary"
                    d="M30 150H200C280 150 320 30 420 30H610"
                    stroke="#a5ebcb"
                    strokeWidth="2.5"
                    fill="none"
                  />
                  <circle cx="610" cy="30" r="5" fill="#a5ebcb" />
                  <circle cx="610" cy="150" r="4" fill="#c3b591" />
                </svg>
                <div className="chart-axis">
                  <span>BEFORE</span>
                  <span>REMEDIATION</span>
                  <span>RETEST</span>
                </div>
              </div>
              <div className="source-chart">
                <h3>
                  {pl
                    ? "Skąd pochodzi sygnał?"
                    : "Where did the signal come from?"}
                </h3>
                <div className="source-ring">
                  <div>
                    <strong>01</strong>
                    <span>{pl ? "ustalenie" : "finding"}</span>
                  </div>
                </div>
                <div className="source-legend">
                  <span>
                    <i />
                    {pl ? "Lokalna reguła" : "Local rule"}
                  </span>
                  <strong>1 / 1</strong>
                </div>
                <p>
                  {pl
                    ? "Manifest package.json. Import SARIF jest osobnym przykładem i nie zwiększa tej liczby."
                    : "The package.json manifest. SARIF import is a separate example and does not inflate this count."}
                </p>
              </div>
            </div>
            <div className="operations-footer mono">
              <span>
                <span className="status-dot" />
                EVIDENCE → PRIORITY → REMEDIATION → RETEST
              </span>
              <span>NO TARGET EXECUTION</span>
            </div>
          </div>
        </section>
        <ConsentLadder locale={locale} />
        <section className="onboarding-section section-shell">
          <div className="onboarding-intro">
            <span className="eyebrow">
              03 / {pl ? "POZNAJ SWOJEGO AGENTA" : "MEET YOUR DEFENDER"}
            </span>
            <h2>
              {pl ? (
                <>
                  Zaczyna od
                  <br />
                  dobrych pytań.
                </>
              ) : (
                <>
                  Good defense
                  <br />
                  starts with questions.
                </>
              )}
            </h2>
            <p>
              {pl
                ? "Agent prowadzi rozmowę jak doświadczony specjalista: poznaje cel, proponuje najmniejszy sensowny test, mówi, czego dotknie i co opuści komputer, a potem wyjaśnia wynik."
                : "Your agent leads like a seasoned specialist: it learns the goal, proposes the smallest useful check, says what it will touch and what leaves the machine, then explains the result."}
            </p>
            <div className="guardian-principles">
              <span>
                <Check size={15} />
                {pl
                  ? "Jedno pytanie na start: co chronimy?"
                  : "One opening question: what are we protecting?"}
              </span>
              <span>
                <Check size={15} />
                {pl
                  ? "Język dopasowany do Ciebie, nie do podręcznika"
                  : "Language matched to you, not to a textbook"}
              </span>
              <span>
                <Check size={15} />
                {pl
                  ? "Zgoda przed każdym krokiem, wynik w trzech punktach"
                  : "Consent before each step, results in three points"}
              </span>
            </div>
            <a
              className="subtle-link"
              href={github(
                "/blob/main/skills/cyber-defense/references/onboarding-and-persona.md",
              )}
            >
              {pl ? "Poznaj sposób pracy" : "Read the playbook"}
              <ArrowUpRight size={15} />
            </a>
          </div>
          <Onboarding locale={locale} />
        </section>
        <section className="capabilities-section" id="capabilities">
          <div className="section-shell">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  04 / {pl ? "MOŻLIWOŚCI" : "THE TOOLKIT"}
                </span>
                <h2>
                  {pl ? (
                    <>
                      Mniej szumu.
                      <br />
                      Więcej dowodów.
                    </>
                  ) : (
                    <>
                      Less noise.
                      <br />
                      More evidence.
                    </>
                  )}
                </h2>
              </div>
              <p>
                {pl
                  ? "Sześć narzędzi, które dają agentowi fakty zamiast domysłów. Każde do wglądu, każde przetestowane."
                  : "Six tools that give your agent facts instead of guesses. Each one inspectable, each one tested."}
              </p>
            </div>
            <div className="capabilities-grid">
              {capabilities.map(({ icon: Icon, title, text, code }, i) => (
                <article key={title} data-agent-target="Builder" data-spot>
                  <div className="capability-top">
                    <Icon size={23} strokeWidth={1.4} />
                    <span className="available-label">
                      {pl ? "DZIAŁA W V0.2" : "AVAILABLE IN V0.2"}
                    </span>
                  </div>
                  <div
                    className={`capability-visual visual-${i % 3}`}
                    aria-hidden="true"
                  >
                    {code.map((line, n) => (
                      <div key={line}>
                        <span>{String(n + 1).padStart(2, "0")}</span>
                        <code>{line}</code>
                      </div>
                    ))}
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <KnowledgeBase locale={locale} />
            <div className="capability-boundaries">
              <div>
                <Radar size={23} />
                <div>
                  <span className="eyebrow">
                    {pl ? "DORADZTWO METODYCZNE" : "EXPERT GUIDANCE"}
                  </span>
                  <h3>
                    {pl ? "Zaplanuj bezpieczny lab." : "Plan a safer lab."}
                  </h3>
                  <p>
                    {pl
                      ? "Izolacja, role API, porty, TLS i kontrola ruchu. Plan i lista kontrolna dla autoryzowanych testów."
                      : "Isolation, API roles, ports, TLS and traffic controls. A plan and checklist for authorized testing."}
                  </p>
                </div>
              </div>
              <div className="roadmap-block">
                <span className="eyebrow">ROADMAP</span>
                <h3>
                  {pl
                    ? "Aktywne testy i automatyczne poprawki"
                    : "Active testing and automatic fixes"}
                </h3>
                <p>
                  {pl
                    ? "Dopiero po wdrożeniu niezależnej kontroli uprawnień i ruchu. Dziś agent tylko czyta."
                    : "Only after independent authorization and traffic controls exist. Today the agent only reads."}
                </p>
                <a href={github("/blob/main/docs/ROADMAP.md")}>
                  {pl ? "Zobacz plan" : "View the roadmap"}
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </section>
        <section className="demo-section section-shell" id="demo">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                05 / {pl ? "PRZYKŁADOWY AUDYT" : "THE INTERACTIVE AUDIT"}
              </span>
              <h2>
                {pl ? (
                  <>
                    Zobacz sygnał.
                    <br />
                    Zrozum decyzję.
                  </>
                ) : (
                  <>
                    See the signal.
                    <br />
                    Understand the decision.
                  </>
                )}
              </h2>
            </div>
            <p>
              {pl
                ? "Wybierz repo, zatwierdź zakres, otwórz dowód i porównaj wynik retestu."
                : "Select a repo, approve its scope, inspect the evidence and compare retest outcomes."}
            </p>
          </div>
          <GuidedDemo locale={locale} />
          <div className="demo-bottom-note">
            <Fingerprint size={16} />
            <p>
              {pl
                ? "Prezentacja na danych statycznych. Przyciski nie uruchamiają skanu."
                : "A static-data presentation. Buttons do not start a real scan."}
            </p>
            <a href={github("/blob/main/examples/sample-audit.md")}>
              {pl ? "Raport Markdown" : "Markdown report"}
              <ArrowUpRight size={14} />
            </a>
          </div>
        </section>
        <section className="install-section section-shell" id="install">
          <div className="install-intro">
            <span className="eyebrow">
              06 / {pl ? "URUCHOM U SIEBIE" : "MAKE IT YOURS"}
            </span>
            <h2>
              {pl ? (
                <>
                  Twój terminal.
                  <br />
                  Twój obrońca.
                </>
              ) : (
                <>
                  Your terminal.
                  <br />
                  Your defender.
                </>
              )}
            </h2>
            <p>
              {pl
                ? "Jeden klon, zero zależności do instalowania. Zacznij od demo na danych przykładowych, potem powiedz agentowi, co chcesz chronić."
                : "One clone, zero dependencies to install. Start with the demo on sample data, then tell your agent what to protect."}
            </p>
            <div className="install-principle">
              <LockKeyhole size={20} />
              <div>
                <strong>
                  {pl ? "Zaczynasz lokalnie." : "Local is the starting point."}
                </strong>
                <p>
                  {pl
                    ? "Narzędzia nie wysyłają Twoich plików. Sieci używają tylko dwa polecenia i tylko po Twojej zgodzie. Host agenta może przekazać dostawcy modelu treść rozmowy."
                    : "The tools never send your files. Only two commands use the network, and only after your consent. Your agent host may share conversation content with its model provider."}
                </p>
              </div>
            </div>
            <a
              className="subtle-link"
              href={github("/blob/main/docs/THREAT_MODEL.md")}
            >
              {pl ? "Poznaj przepływ danych" : "Understand the data flow"}
              <ArrowUpRight size={15} />
            </a>
          </div>
          <Installation locale={locale} />
        </section>
        <TrustSection locale={locale} />
        <section className="faq-section section-shell" id="faq">
          <div>
            <span className="eyebrow">07 / FAQ</span>
            <h2>
              {pl ? (
                <>
                  Jasne odpowiedzi.
                  <br />
                  Przed startem.
                </>
              ) : (
                <>
                  Clear answers.
                  <br />
                  Before you start.
                </>
              )}
            </h2>
            <a className="subtle-link" href={github("/blob/main/SECURITY.md")}>
              {pl ? "Zasady bezpieczeństwa" : "Security policy"}
              <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="faq-list">
            {faq.map(([q, a]) => (
              <details key={q}>
                <summary>
                  <span>{q}</span>
                  <ChevronDown size={18} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section
          className="final-cta section-shell"
          data-agent-target="Verifier"
          data-agent-label={
            pl
              ? "Gotowe do Twojego pierwszego audytu"
              : "Ready for your first audit"
          }
        >
          <div className="final-mark">
            <Mark />
          </div>
          <span className="eyebrow">
            {pl
              ? "MIT · 0 ZŁ · BEZ KONTA · NODE.JS 22+"
              : "MIT · FREE · NO ACCOUNT · NODE.JS 22+"}
          </span>
          <h2>
            {pl ? (
              <>
                Nie zgaduj.
                <br />
                <span>Sprawdź.</span>
              </>
            ) : (
              <>
                Don’t just assume.
                <br />
                <span>Verify.</span>
              </>
            )}
          </h2>
          <p>
            {pl
              ? "Sklonuj repozytorium, uruchom demo i zapytaj agenta: „co powinienem zaktualizować?”. Pierwszy wynik zobaczysz po kilku minutach."
              : "Clone the repository, run the demo and ask your agent: “what should I update?”. You will see a first result within minutes."}
          </p>
          <GitHubLink>{start}</GitHubLink>
          <a className="final-secondary" href="#demo">
            {pl ? "Najpierw zobacz demo" : "Explore the demo first"}
            <ArrowRight size={15} />
          </a>
        </section>
      </main>
      <footer className="site-footer section-shell">
        <a href="#main" className="brand">
          <Mark small />
          <span>
            cyber<span className="brand-light">defense</span>
          </span>
        </a>
        <span className="footer-license">MIT · v0.2 · © 2026</span>
        <nav aria-label={pl ? "Linki w stopce" : "Footer links"}>
          <a href={asset(pl ? "/pl/policies/" : "/policies/")}>
            {pl ? "Prywatność i cookies" : "Privacy & cookies"}
          </a>
          <a href={github()}>
            GitHub
            <GitBranch size={13} />
          </a>
          <a href={github("/blob/main/SECURITY.md")}>
            {pl ? "Bezpieczeństwo" : "Security"}
          </a>
          <a href={github("/blob/main/docs/RESEARCH.md")}>
            {pl ? "Baza wiedzy" : "Knowledge base"}
          </a>
          <a href={github("/blob/main/skills/agent-build-scroll/SKILL.md")}>
            {pl ? "Skill animacji" : "Motion skill"}
            <Terminal size={13} />
          </a>
        </nav>
      </footer>
      <AgentBuildScroll locale={locale} />
      <ExpertEffects />
    </>
  );
}
