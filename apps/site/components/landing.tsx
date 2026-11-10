import { ArrowDown, ArrowRight, ArrowUpRight, ChevronDown, GitBranch, LockKeyhole, Sparkles, Terminal } from "lucide-react";
import { Navigation } from "./navigation";
import { Installation } from "./installation";
import { AgentBuildScroll } from "./motion-system";
import { HeroSignal } from "./hero-signal";
import { HostWorkflows } from "./host-workflows";
import { Missions } from "./missions";
import { ConsentLadder } from "./skill-story";
import { ExpertEffects } from "./expert-effects";
import { ScanTheater } from "./scan-theater";
import { ReportShowcase } from "./report-showcase";
import { GitHubLink, Mark } from "./ui";
import { asset, github, type Locale } from "@/lib/config";

export function Landing({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const start = pl ? "Zobacz na GitHubie" : "Start on GitHub";
  const faq = pl
    ? [
        [
          "Co dokładnie potrafi agent z tym skillem?",
          "Sprawdza komputer lub serwer (programy, znane luki, porty), stronę WWW (HTTPS, nagłówki, cookies, TLS), kod projektu (zależności, sekrety, reguły bezpieczeństwa), bazę danych i sieć. Wszystko w trybie tylko do odczytu, z dowodem i retestem.",
        ],
        [
          "Co dostaję po audycie?",
          "Czytelny raport HTML i PDF (werdykt, priorytety P0–P3, trzy rzeczy na start, gotowe poprawki) oraz lokalny panel dashboard.html odświeżany na żywo podczas pracy agenta.",
        ],
        [
          "Co opuszcza mój komputer i czy agent sam coś zmienia?",
          "Domyślnie nic nie opuszcza komputera, a narzędzia działają wyłącznie w trybie odczytu. Tylko komendy advisories (OSV.dev) i web (pasywne GET) używają sieci — zawsze po Twojej jawnej zgodzie. Poprawki wdrażasz sam.",
        ],
        [
          "Ile to kosztuje i kto rozwija projekt?",
          "Projekt jest w 100% darmowy i otwarty (licencja MIT), rozwijany przez AI Evolution Polska. Wymaga jedynie Node.js 22+ oraz Git.",
        ],
      ]
    : [
        [
          "What exactly can my agent do with this skill?",
          "Check a computer or server (installed apps, CVEs, open ports), a website (HTTPS, headers, cookies, TLS), project code (dependencies, secrets, security rules), databases and networks. All read-only, with evidence and retesting.",
        ],
        [
          "What do I get after an audit?",
          "A clean HTML and PDF report (verdict, P0–P3 priorities, top three actions, exact fixes) plus a live local dashboard.html that updates as your agent works.",
        ],
        [
          "What leaves my machine, and does the agent change anything?",
          "Nothing leaves by default, and tools are strictly read-only. Only advisories (OSV.dev) and web (passive GET) use the network — always after your explicit flag. You apply changes yourself.",
        ],
        [
          "What does it cost and who builds it?",
          "100% free and open source (MIT license), created and maintained by AI Evolution Polska. Requires only Node.js 22+ and Git.",
        ],
      ];

  const stats: [number, string][] = pl
    ? [[9, "playbooków eksperckich"], [6, "obszarów ochrony"], [72, "testy bezpieczeństwa CLI"], [0, "zmian bez Twojej zgody"]]
    : [[9, "expert playbooks"], [6, "protection areas"], [72, "CLI security tests"], [0, "changes without consent"]];

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
              data-agent-label={pl ? "Budowanie systemu obrony" : "Building your defense"}
            >
              <div className="eyebrow hero-eyebrow">
                <span className="status-dot" />
                {pl
                  ? "POLSKI SKILL OPEN SOURCE · V0.2 · AI EVOLUTION POLSKA"
                  : "OPEN-SOURCE AI SKILL · V0.2 · BY AI EVOLUTION POLSKA"}
              </div>
              <h1 id="hero-title">
                {pl ? (
                  <>
                    Twój agent AI,
                    <br />
                    <span>teraz ekspert security.</span>
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
                  ? "Jeden skill uczy Twojego agenta sprawdzać kod, komputer, stronę WWW, bazę danych i sieć. Znajduje luki, tłumaczy je prostym językiem, przygotowuje poprawkę i weryfikuje wdrożenie — zawsze za Twoją zgodą."
                  : "One skill teaches your agent to audit code, computers, websites, databases and networks. It finds gaps, explains them in plain language, prepares the fix and verifies the result — always with your consent."}
              </p>
              <div className="hero-ctas">
                <GitHubLink>{start}</GitHubLink>
                <a href="#scan" className="button button-secondary">
                  {pl ? "Zobacz, jak działa" : "Watch it work"}
                  <ArrowDown size={16} />
                </a>
              </div>
              <div className="hero-assurance">
                <LockKeyhole size={14} />
                {pl
                  ? "100% odczyt lokalny · Zgoda przed każdym krokiem · Raport HTML i PDF"
                  : "100% read-only · Consent before every step · HTML & PDF report"}
              </div>
              <div className="hero-terminal">
                <span className="terminal-prompt">$</span>
                <code>node tools/cda.mjs start</code>
                <span className="terminal-sep">·</span>
                <code>node tools/cda.mjs ui</code>
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
        </section>

        <HostWorkflows locale={locale} />
        <Missions locale={locale} />
        <ScanTheater locale={locale} />
        <ReportShowcase locale={locale} />
        <ConsentLadder locale={locale} />

        <section data-build-section className="install-section section-shell" id="install">
          <div className="install-intro">
            <span className="eyebrow">
              06 / {pl ? "SZYBKI START" : "QUICK START"}
            </span>
            <h2>
              {pl ? (
                <>
                  Uruchom u siebie
                  <br />
                  <span className="gradient-text">w 60 sekund.</span>
                </>
              ) : (
                <>
                  Run it locally
                  <br />
                  <span className="gradient-text">in 60 seconds.</span>
                </>
              )}
            </h2>
            <p>
              {pl
                ? "Jeden klon repozytorium, zero zewnętrznych zależności npm w CLI. Wypróbuj bezpieczne demo na syntetycznych danych, a potem wskaż własny projekt."
                : "One repository clone, zero external npm dependencies in the CLI. Run the safe synthetic demo first, then point your agent at your own project."}
            </p>
            <div className="install-principle">
              <LockKeyhole size={20} />
              <div>
                <strong>
                  {pl ? "Prywatność i pełna kontrola." : "Privacy and full control."}
                </strong>
                <p>
                  {pl
                    ? "Narzędzia nie wysyłają Twoich plików. Sieci używają wyłącznie komendy advisories oraz web — tylko po podaniu jawnej flagi zgody."
                    : "The tools never upload your files. Only the advisories and web commands touch the network — and only when you pass an explicit consent flag."}
                </p>
              </div>
            </div>
            <a
              className="subtle-link"
              href={github("/blob/main/docs/THREAT_MODEL.md")}
            >
              {pl ? "Architektura i model zagrożeń" : "Architecture & threat model"}
              <ArrowUpRight size={15} />
            </a>
          </div>
          <Installation locale={locale} />
        </section>

        <section className="faq-section section-shell" id="faq">
          <div>
            <span className="eyebrow">07 / FAQ</span>
            <h2>
              {pl ? (
                <>
                  Krótkie odpowiedzi
                  <br />
                  <span className="gradient-text">przed startem.</span>
                </>
              ) : (
                <>
                  Quick answers
                  <br />
                  <span className="gradient-text">before you start.</span>
                </>
              )}
            </h2>
            <a className="subtle-link" href={github("/blob/main/SECURITY.md")}>
              {pl ? "Polityka bezpieczeństwa" : "Security policy"}
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
              ? "MIT · DARMOWE · BEZ KONTA · NODE.JS 22+"
              : "MIT · FREE · NO ACCOUNT · NODE.JS 22+"}
          </span>
          <h2>
            {pl ? (
              <>
                Nie zgaduj.
                <br />
                <span>Zweryfikuj z dowodem.</span>
              </>
            ) : (
              <>
                Don’t guess.
                <br />
                <span>Verify with evidence.</span>
              </>
            )}
          </h2>
          <p>
            {pl
              ? "Sklonuj repozytorium, uruchom demo i napisz agentowi: „sprawdź mój projekt”. Pierwszy raport zobaczysz w kilka minut."
              : "Clone the repository, run the demo and tell your agent: “check my project”. You will have your first report in minutes."}
          </p>
          <div className="final-cta-actions">
            <GitHubLink>{start}</GitHubLink>
            <a className="button button-secondary" href="#scan">
              {pl ? "Zobacz symulację" : "Watch simulation"}
              <ArrowRight size={15} />
            </a>
          </div>
          <div className="creator-credit-pill">
            <Sparkles size={14} aria-hidden="true" />
            <span>
              {pl ? "Stworzone i rozwijane przez " : "Created and maintained by "}
              <a href="https://github.com/aievolutionpl" target="_blank" rel="noreferrer">
                AI Evolution Polska
              </a>
            </span>
          </div>
        </section>
      </main>
      <footer className="site-footer section-shell">
        <div className="footer-brand-group">
          <a href="#main" className="brand">
            <Mark small />
            <span>
              cyber<span className="brand-light">defense</span>
            </span>
          </a>
          <span className="footer-license">
            MIT · v0.2 · © 2026{" "}
            <a href="https://github.com/aievolutionpl" className="footer-credit-link">
              AI Evolution Polska
            </a>
          </span>
        </div>
        <nav aria-label={pl ? "Linki w stopce" : "Footer links"}>
          <a href="https://github.com/aievolutionpl">
            AI Evolution Polska
            <ArrowUpRight size={13} />
          </a>
          <a href={asset(pl ? "/policies/" : "/en/policies/")}>
            {pl ? "Prywatność i zasady" : "Privacy & policies"}
          </a>
          <a href={github()}>
            GitHub
            <GitBranch size={13} />
          </a>
          <a href={github("/blob/main/SECURITY.md")}>
            {pl ? "Bezpieczeństwo" : "Security"}
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
