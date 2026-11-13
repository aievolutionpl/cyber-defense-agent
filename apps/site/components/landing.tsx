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
  const faq = pl ? [
    ["Co jest programem, a co skillem?", "Skill prowadzi rozmowę i analizę w Twoim agencie AI. Lokalny CLI zbiera wybrane dowody i buduje raporty. Ta strona prezentuje możliwości i pomaga przygotować brief; nie skanuje komputera ani nie przyjmuje plików."],
    ["Co naprawdę zostaje sprawdzone?", "Zakres zależy od zatwierdzonej misji. CLI ma osiem lokalnych reguł, odczyt zależności, import raportów i pasywną kontrolę strony. Logika aplikacji, bazy danych oraz konfiguracja agentów wymagają przeglądu eksperckiego. Raport rozdziela dowody, ocenę modelu i brak danych."],
    ["Co dostaję po przeglądzie?", "Lokalny raport HTML: najważniejsze ustalenia, ich znaczenie, dowody, plan naprawy i sposób weryfikacji. PDF powstaje po zgodzie na uruchomienie lokalnej przeglądarki lub przez Drukuj → Zapisz jako PDF. Panel pokazuje postęp i historię."],
    ["Co opuszcza mój komputer?", "Lokalne polecenia CLI nie wywołują modelu. Odpytanie OSV wysyła nazwy, wersje i ekosystemy pakietów po osobnej zgodzie; kontrola WWW łączy się ze wskazaną stroną. Codex, Claude Code i inne hosty mogą przekazywać treść rozmowy swojemu dostawcy. Udostępniaj tylko niezbędny, sprawdzony materiał."],
    ["Czy agent naprawi problem sam?", "Przygotuje propozycję zmiany i sposób jej cofnięcia. Wdrożenie wymaga Twojej decyzji. Retest potwierdza tylko to, co da się ponownie sprawdzić w tym samym zakresie; zniknięcie alertu z importowanego raportu nie jest dowodem naprawy."],
    ["Ile to kosztuje?", "Kod projektu jest dostępny na licencji MIT. Lokalne CLI i syntetyczne demo wymagają Node.js 22+ oraz pobrania repozytorium, bez instalacji pakietów npm. Wybrany agent AI ma własne wymagania konta, limity i ewentualne opłaty."],
  ] : [
    ["Which part is the program, and which is the skill?", "The skill guides conversation and analysis in your AI agent. The local CLI collects selected evidence and builds reports. This website explains the capabilities and prepares a brief; it does not scan your computer or accept files."],
    ["What is actually checked?", "Coverage depends on the approved mission. The CLI provides eight local rules, dependency inventories, report imports and a passive website check. Application logic, databases and agent configurations need expert review. Reports distinguish evidence, model judgment and missing data."],
    ["What do I get after a review?", "A local HTML report with priorities, impact, evidence, a repair plan and verification steps. PDF export requires permission to start your local browser, or you can use Print → Save as PDF. The panel shows progress and run history."],
    ["What leaves my machine?", "Local CLI commands do not call a model. OSV lookup shares package names, versions and ecosystems with separate consent; website checks contact the named site. Codex, Claude Code and other hosts may send conversation content to their provider. Share only the minimum reviewed material."],
    ["Will the agent fix issues automatically?", "It prepares a proposed change and rollback. Applying it requires your decision. Retesting confirms only what can be checked again in the same scope; an alert disappearing from an imported report is not proof of a fix."],
    ["What does it cost?", "The project is MIT licensed. The local CLI and synthetic demo need Node.js 22+ and a repository download, without npm package installation. Your chosen AI host has its own account requirements, limits and possible charges."],
  ];
  const stats: [number, string][] = pl
    ? [[8, "lokalnych reguł analizy"], [7, "scenariuszy przeglądu"], [2, "formaty raportu: HTML i PDF"], [0, "automatycznych napraw"]]
    : [[8, "local analysis rules"], [7, "review scenarios"], [2, "report formats: HTML & PDF"], [0, "automatic remediations"]];

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
                    Wiesz, co poprawić.
                    <br />
                    <span>Masz na to dowód.</span>
                  </>
                ) : (
                  <>
                    Know what to fix.
                    <br />
                    <span>See the evidence.</span>
                  </>
                )}
              </h1>
              <p className="hero-description">
                {pl
                  ? "Kod, zależności, konfiguracja agentów AI. Zbierz dowody, ustal kolejność napraw i sprawdź wynik po zmianie. Cyber Defense prowadzi Cię przez cały przegląd, w zakresie, który zatwierdzisz."
                  : "Code, dependencies, AI agent configuration. Gather evidence, decide what to fix first and check the result. Cyber Defense guides the review within the scope you approve."}
              </p>
              <div className="hero-ctas">
                <a href="#missions" className="button button-primary">{pl ? "Wybierz swój przegląd" : "Plan your review"}<ArrowRight size={17} /></a>
                <a href="#scan" className="button button-secondary">
                  {pl ? "Zobacz, jak działa" : "Watch it work"}
                  <ArrowDown size={16} />
                </a>
              </div>
              <div className="hero-assurance">
                <LockKeyhole size={14} />
                {pl
                  ? "Zatwierdzony zakres · Konkretne dowody · Plan naprawy"
                  : "Approved scope · Concrete evidence · A repair plan"}
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
                  Uruchom lokalnie.
                  <br />
                  <span className="gradient-text">Zobacz pierwszy raport.</span>
                </>
              ) : (
                <>
                  Run it locally.
                  <br />
                  <span className="gradient-text">Start with a report.</span>
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
                  {pl ? "Wiesz, gdzie trafiają dane." : "Know where your data goes."}
                </strong>
                <p>
                  {pl
                    ? "CLI zbiera dowody lokalnie. Wyszukiwanie podatności i sprawdzanie strony wymagają osobnych zgód. Twój agent AI korzysta z zasad prywatności wybranego dostawcy."
                    : "The CLI collects evidence locally. Advisory lookups and website checks require separate consent. Your AI host follows its provider’s data-handling settings."}
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
              ? "MIT · LOKALNE CLI · NODE.JS 22+"
              : "MIT · LOCAL CLI · NODE.JS 22+"}
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
              ? "Zacznij od przykładowego raportu na syntetycznych danych. Potem wybierz obszar, który chcesz sprawdzić, i ustal z agentem pierwszy zakres."
              : "Start with a sample report built from synthetic data. Then choose an area to review and agree the first scope with your agent."}
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
