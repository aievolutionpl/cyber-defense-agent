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
  Layers3,
  LockKeyhole,
  Radar,
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
import { GitHubLink, Mark } from "./ui";
import { asset, github, type Locale } from "@/lib/config";

export function Landing({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const start = pl ? "Zacznij na GitHubie" : "Start on GitHub";
  const faq = pl
    ? [
        [
          "Co działa w v0.1?",
          "Lokalny przegląd wskazanych plików czterema regułami (lodash, TLS, możliwy sekret, eval), onboarding z zatwierdzonej listy, import cda.scan.v1 JSON i ograniczonego SARIF 2.1.0, Markdown, retest i plan aktualizacji na podstawie dostarczonego wykazu offline. To wąskie, jawne kontrole, a nie pełny SAST lub aktualizowana baza CVE.",
        ],
        [
          "Czy kod opuszcza mój komputer?",
          "Narzędzia CLI działają lokalnie bez sieci, SDK modeli i telemetrii. Host agenta może wysłać dostawcy modelu prompt, wynik narzędzia i fragmenty raportu dodane do czatu. Najpierw przejrzyj zredagowany Markdown lokalnie. Redakcja wzorców nie wykryje każdego sekretu; nazwy plików też mogą być poufne.",
        ],
        [
          "Czy agent uruchamia albo zmienia mój projekt?",
          "Nie. Zatwierdzona lista plików wygasa po 24 godzinach. CLI blokuje wyjście poza zakres oraz dowiązania, nie instaluje zależności ani nie uruchamia kodu projektu. Demo zmienia tylko własną tymczasową kopię danych. Kontrola CLI nie zastępuje izolacji systemowej ani ograniczeń innych narzędzi hosta.",
        ],
        [
          "Czy zniknięcie ustalenia potwierdza poprawkę?",
          "Nie. confirmed_fixed wymaga tej samej lokalnej reguły, bieżącego pliku, zgodnego odcisku i powtórnej kontroli. Niepełny import daje insufficient_data. Wynik jednej reguły nie potwierdza bezpieczeństwa całego systemu.",
        ],
        [
          "Czy mogę skanować web, API i sieć?",
          "W v0.1 dostępne jest doradztwo metodyczne dotyczące labu i analiza obsługiwanych lokalnych artefaktów. Aktywne testy web/API i sieci są w roadmapie do czasu wdrożenia niezależnej kontroli uprawnień i ruchu. Agent nie wysyła ruchu do celu.",
        ],
        [
          "Czy Codex, Claude Code i Hermes są przetestowane?",
          "Lokalne CLI i kontrakt wspólnych instrukcji są przetestowane. Pełna sesja modelowa w Codex jest niezweryfikowana z powodu błędu uruchomienia powłoki; w Claude Code z powodu limitu konta (HTTP 429). Punkt wejścia Hermes jest eksperymentalny i niezweryfikowany.",
        ],
        [
          "Ile to kosztuje?",
          "Kod własny jest dostępny na licencji MIT. Demo CLI wymaga Node.js 22+ i Git, bez konta i płatnych wywołań. Dostęp do modelu w wybranym środowisku rozliczasz osobno według warunków dostawcy.",
        ],
      ]
    : [
        [
          "What actually works in v0.1?",
          "Local review of explicit files with four rules (lodash, TLS, possible secrets, eval), onboarding from the approved list, cda.scan.v1 JSON and limited SARIF 2.1.0 import, Markdown reports, conservative retesting and offline update-inventory planning. These are narrow, transparent checks, not a complete SAST engine or a live CVE database.",
        ],
        [
          "Does my code leave my machine?",
          "The CLI tools are local, with no network, model SDK or telemetry. Your agent host may send prompts, tool output and report excerpts included in chat to its model provider. Review the redacted Markdown locally first. Pattern redaction cannot catch every secret; filenames can also be sensitive.",
        ],
        [
          "Will the agent run or change my project?",
          "No. The exact approved file list expires after 24 hours. The CLI rejects out-of-scope paths and links, and never installs dependencies or runs target code. The demo changes only its own temporary copy. CLI guards do not replace OS isolation or restrictions on the host’s other tools.",
        ],
        [
          "Does a missing finding prove a fix?",
          "No. confirmed_fixed requires the same local rule, the current file, a matching digest and a repeated check. An incomplete import yields insufficient_data. A clean result from one rule is not proof that the system is secure.",
        ],
        [
          "Can it scan websites, APIs and networks?",
          "v0.1 offers lab planning guidance and analysis of supported local artifacts. Active web/API and network testing stays on the roadmap until independent authorization and traffic controls exist. The agent tools send no traffic to the target.",
        ],
        [
          "Are Codex, Claude Code and Hermes verified?",
          "The local CLI and shared instruction contract are tested. A full model session in Codex remains unverified due to a shell launch error; Claude Code due to an account limit (HTTP 429). The Hermes entry point is experimental and unverified.",
        ],
        [
          "What does it cost?",
          "Our code is MIT licensed. The CLI demo requires Node.js 22+ and Git, with no account or paid calls. Model access in your chosen environment is a separate service billed under your provider’s terms.",
        ],
      ];
  const capabilities = pl
    ? [
        {
          icon: FileCode2,
          title: "Kod. Konfiguracja. Konkret.",
          text: "Cztery jawne reguły. Lokalizacja, zredagowany dowód, priorytet i sugerowana poprawka.",
          code: [
            "CDA-DEP-001  lodash",
            "CDA-TLS-001  TLS verification",
            "CDA-SECRET-001  secrets",
            "CDA-EVAL-001 eval",
          ],
        },
        {
          icon: Layers3,
          title: "Z raportów zrób decyzje.",
          text: "JSON cda.scan.v1 i SARIF 2.1.0 w jednym, spójnym raporcie Markdown. Deduplikacja, priorytety, bez surowej treści importu.",
          code: ["JSON / SARIF", "↓ normalize + redact", "audit.md"],
        },
        {
          icon: FileCheck2,
          title: "Poprawka potrzebuje dowodu.",
          text: "Porównanie przed i po. Potwierdzona poprawka, nadal obecny sygnał lub brak danych. Zero zgadywania.",
          code: ["confirmed_fixed", "still_present", "insufficient_data"],
        },
      ]
    : [
        {
          icon: FileCode2,
          title: "Code. Configuration. Clarity.",
          text: "Four transparent rules. A location, redacted evidence, priority and a suggested fix for every finding.",
          code: [
            "CDA-DEP-001  lodash",
            "CDA-TLS-001  TLS verification",
            "CDA-SECRET-001  secrets",
            "CDA-EVAL-001 eval",
          ],
        },
        {
          icon: Layers3,
          title: "Turn reports into decisions.",
          text: "cda.scan.v1 JSON and SARIF 2.1.0 in one consistent Markdown report. Deduplicated and prioritised, without raw import text.",
          code: ["JSON / SARIF", "↓ normalize + redact", "audit.md"],
        },
        {
          icon: FileCheck2,
          title: "Every fix needs evidence.",
          text: "Compare before and after. A confirmed fix, a remaining signal or insufficient data. No guessing.",
          code: ["confirmed_fixed", "still_present", "insufficient_data"],
        },
      ];
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
                  ? "TWÓJ LOKALNY AGENT BEZPIECZEŃSTWA"
                  : "YOUR LOCAL SECURITY COPILOT"}
              </div>
              <h1 id="hero-title">
                {pl ? (
                  <>
                    Twój agent tworzy.
                    <br />
                    <span>Naucz go chronić.</span>
                  </>
                ) : (
                  <>
                    Your agent builds.
                    <br />
                    <span>Teach it to defend.</span>
                  </>
                )}
              </h1>
              <p className="hero-description">
                {pl
                  ? "Zamień pośpiech przed wdrożeniem w uporządkowany przegląd. Sprawdź kod, konfigurację i listy aktualizacji. Zobacz dowód, ustal priorytet i zweryfikuj poprawkę."
                  : "Turn the pre-release rush into a repeatable security review. Inspect code, configuration and update inventories. See the evidence, prioritise the change and verify the fix."}
              </p>
              <div className="hero-ctas">
                <GitHubLink>{start}</GitHubLink>
                <a href="#demo" className="button button-secondary">
                  {pl ? "Zobacz przykładowy audyt" : "Explore the audit"}
                  <ArrowDown size={16} />
                </a>
              </div>
              <div className="hero-assurance">
                <LockKeyhole size={14} />
                {pl
                  ? "Lokalne narzędzia. Jawny zakres. Otwarty kod."
                  : "Local tools. Explicit scope. Open source."}
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
          <div className="hero-foot section-shell">
            <span className="mono">V0.1 / OPEN SOURCE</span>
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
                ? "Agent prowadzi. Ty zatwierdzasz zakres. Każda decyzja ma ślad w dowodach."
                : "The agent guides. You approve the boundaries. Every decision has an evidence trail."}
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
                    "Sklonuj repo i wywołaj skill w Codex lub Claude Code. Zacznij od gotowego demo.",
                  ],
                  [
                    "Wyznacz granice.",
                    "Zatwierdź katalog i dokładną listę plików. Domyślnie nie ma zgody na odczyt całego repo.",
                  ],
                  [
                    "Sprawdź, potem napraw.",
                    "Przeczytaj dowód i poprawkę. Retest pokaże potwierdzenie albo wskaże brak danych.",
                  ],
                ]
              : [
                  [
                    "Open your workspace.",
                    "Clone the repo and invoke the skill in Codex or Claude Code. Start with the bundled demo.",
                  ],
                  [
                    "Draw the boundaries.",
                    "Approve a directory and an exact list of files. No implicit permission to read the entire repo.",
                  ],
                  [
                    "Inspect. Fix. Verify.",
                    "Read the evidence and remediation. The retest confirms a fix or shows where data is missing.",
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
                ? "Bez ściany niezrozumiałych alertów. Agent poznaje cel, proponuje plan i wyjaśnia następny krok."
                : "No wall of unexplained alerts. Your agent understands the goal, proposes a plan and explains the next step."}
            </p>
            <div className="guardian-principles">
              <span>
                <Check size={15} />
                {pl
                  ? "Trzy pytania na start"
                  : "Three questions to get started"}
              </span>
              <span>
                <Check size={15} />
                {pl
                  ? "Plan dopasowany do celu"
                  : "A plan shaped around your goal"}
              </span>
              <span>
                <Check size={15} />
                {pl
                  ? "Zatwierdzenie przed odczytem"
                  : "Approval before reading files"}
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
                  ? "Mały, przejrzysty zestaw narzędzi. Dokładnie wiesz, co zostało sprawdzone."
                  : "A focused, inspectable set of tools. You know exactly what was checked."}
              </p>
            </div>
            <div className="capabilities-grid">
              {capabilities.map(({ icon: Icon, title, text, code }, i) => (
                <article key={title} data-agent-target="Builder">
                  <div className="capability-top">
                    <Icon size={23} strokeWidth={1.4} />
                    <span className="available-label">
                      {pl ? "DZIAŁA W V0.1" : "AVAILABLE IN V0.1"}
                    </span>
                  </div>
                  <div
                    className={`capability-visual visual-${i}`}
                    aria-hidden="true"
                  >
                    {code.map((line, n) => (
                      <div key={line}>
                        <span>{String(n + 1).padStart(2, "0")}</span>
                        <code>{line}</code>
                        {i === 0 && <Check size={12} />}
                      </div>
                    ))}
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
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
                      ? "Izolacja, role API, porty, TLS i kontrola ruchu. Instrukcje i analiza lokalnych artefaktów."
                      : "Isolation, API roles, ports, TLS and traffic controls. Planning and local artifact analysis."}
                  </p>
                </div>
              </div>
              <div className="roadmap-block">
                <span className="eyebrow">ROADMAP</span>
                <h3>
                  {pl
                    ? "Aktywne testy web / API / sieci"
                    : "Active web / API / network tests"}
                </h3>
                <p>
                  {pl
                    ? "Po wdrożeniu niezależnej kontroli uprawnień i ruchu."
                    : "After independent authorization and traffic controls are implemented."}
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
                ? "Jeden klon. Wspólna instrukcja skilla. Pierwszy audyt na danych demonstracyjnych."
                : "One clone. One shared skill instruction. A first audit on synthetic demo data."}
            </p>
            <div className="install-principle">
              <LockKeyhole size={20} />
              <div>
                <strong>
                  {pl ? "Zaczynasz lokalnie." : "Local is the starting point."}
                </strong>
                <p>
                  {pl
                    ? "CLI nie wysyła plików. Host agenta może przekazać dostawcy modelu treść dodaną do rozmowy."
                    : "The CLI sends no files. Your agent host may share content included in the conversation with its model provider."}
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
              ? "ZACZNIJ OD ZAKRESU. DOJDŹ DO DOWODU."
              : "START WITH SCOPE. FINISH WITH EVIDENCE."}
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
              ? "Zrób pierwszy krok z Cyber Defense Agent."
              : "Take the first step with Cyber Defense Agent."}
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
        <span className="footer-license">MIT · v0.1 · © 2026</span>
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
    </>
  );
}
