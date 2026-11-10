import { ArrowUpRight, Ban, BookOpen, Check, X } from "lucide-react";
import { github, type Locale } from "@/lib/config";

const K = "/blob/main/skills/cyber-defense/references/knowledge/";

export function SkillCompare({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const without = pl
    ? ["„Wygląda w porządku.” Bez żadnego dowodu.", "Wersje i numery CVE podaje z pamięci.", "Uruchamia polecenia, zanim zapyta.", "Dwieście alertów bez kolejności.", "„Naprawione”, bo zniknęło z listy."]
    : ["“Looks fine to me.” With no evidence.", "Versions and CVE numbers recalled from memory.", "Runs commands before asking.", "Two hundred alerts in no order.", "“Fixed”, because it left the list."];
  const withSkill = pl
    ? ["Każde ustalenie ma dowód: plik, wersję, nagłówek.", "Sprawdza aktualne bazy: OSV.dev i CISA KEV.", "Pyta o zgodę przed każdym krokiem.", "Najpierw trzy najważniejsze rzeczy (P0–P3).", "Retest: potwierdzona poprawka albo uczciwe „brak danych”."]
    : ["Every finding has evidence: the file, version or header.", "Checks live sources: OSV.dev and CISA KEV.", "Asks for consent before every step.", "The three things that matter first (P0–P3).", "Retest: a confirmed fix, or an honest “not enough data”."];
  return (
    <section className="compare-section section-shell" aria-labelledby="compare-title">
      <div className="section-heading" data-reveal>
        <div>
          <span className="eyebrow">{pl ? "RÓŻNICA" : "THE DIFFERENCE"}</span>
          <h2 id="compare-title">
            {pl ? "Ten sam agent." : "Same agent."}
            <br />
            <span className="gradient-text">{pl ? "Zupełnie inny poziom." : "A different league."}</span>
          </h2>
        </div>
        <p>
          {pl
            ? "Model językowy wie dużo o bezpieczeństwie. Skill daje mu to, czego mu brakuje: metodę, aktualne źródła, granice i dowód."
            : "A language model knows a lot about security. The skill adds what it lacks: a method, live sources, boundaries and proof."}
        </p>
      </div>
      <div className="compare-grid" data-agent-target="Verifier" data-agent-label={pl ? "Porównanie" : "Comparing"}>
        <article className="compare-card compare-without" data-reveal>
          <span className="compare-label">{pl ? "AGENT BEZ SKILLA" : "AGENT WITHOUT THE SKILL"}</span>
          <ul>
            {without.map((text) => (
              <li key={text}><X size={15} aria-hidden="true" />{text}</li>
            ))}
          </ul>
        </article>
        <article className="compare-card compare-with" data-spot data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
          <span className="compare-label">{pl ? "Z CYBER DEFENSE" : "WITH CYBER DEFENSE"}</span>
          <ul>
            {withSkill.map((text) => (
              <li key={text}><Check size={15} aria-hidden="true" />{text}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

export function ConsentLadder({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const steps: [string, string, string, string][] = pl
    ? [
        ["L0", "Doradza", "Wyjaśnia i planuje. Niczego nie dotyka.", "domyślnie"],
        ["L1", "Czyta pliki", "Tylko dokładnie zatwierdzoną listę, przez 24 godziny.", "approve --yes"],
        ["L2", "Zagląda do komputera", "Programy i otwarte porty. Bez nazwy komputera i użytkownika.", "inventory --yes"],
        ["L3", "Pyta internet", "Wysyła wyłącznie nazwy i wersje pakietów.", "--share-package-names"],
        ["L4", "Sprawdza Twoją stronę", "Kilka zwykłych zapytań GET. Zero ruchu atakującego.", "--authorized"],
        ["L5", "Zmiany", "Nigdy sam. Przygotowuje poprawkę i sposób cofnięcia. Wdrażasz Ty.", "Twoja decyzja"],
      ]
    : [
        ["L0", "Advises", "Explains and plans. Touches nothing.", "default"],
        ["L1", "Reads files", "Only the exact list you approved, for 24 hours.", "approve --yes"],
        ["L2", "Looks at this machine", "Programs and open ports. No computer or user name.", "inventory --yes"],
        ["L3", "Asks the internet", "Sends package names and versions only.", "--share-package-names"],
        ["L4", "Checks your website", "A few ordinary GET requests. Zero attack traffic.", "--authorized"],
        ["L5", "Changes", "Never on its own. It prepares the fix and the rollback. You apply it.", "your decision"],
      ];
  const never = pl
    ? ["Nie atakuje i nie pisze exploitów", "Nie testuje cudzych systemów", "Nie zgaduje haseł", "Nie ukrywa swoich działań"]
    : ["No attacks, no exploits", "No systems you don't own", "No password guessing", "No hiding what it does"];
  return (
    <section className="ladder-section section-shell" id="control" aria-labelledby="ladder-title">
      <div className="ladder-intro" data-reveal>
        <span className="eyebrow">{pl ? "TY DECYDUJESZ" : "YOU STAY IN CONTROL"}</span>
        <h2 id="ladder-title">
          {pl ? "Sześć stopni." : "Six steps."}
          <br />
          <span className="gradient-text">{pl ? "Żaden bez Twojej zgody." : "None without your yes."}</span>
        </h2>
        <p>
          {pl
            ? "Agent wchodzi wyżej tylko wtedy, gdy powiesz „tak” na konkretny krok. Zgoda jest zapisana w poleceniu jako jawna flaga, a nie domysł modelu."
            : "The agent climbs only when you say yes to that specific step. Consent is an explicit flag in the command, not the model's guess."}
        </p>
        <ul className="never-list" aria-label={pl ? "Twarde granice" : "Hard lines"}>
          {never.map((text) => (
            <li key={text}><Ban size={14} aria-hidden="true" />{text}</li>
          ))}
        </ul>
      </div>
      <ol className="ladder" data-agent-target="Builder" data-agent-label={pl ? "Budowanie drabiny zgód" : "Building the consent ladder"}>
        {steps.map(([level, title, text, gate], n) => (
          <li key={level} data-reveal style={{ "--reveal-delay": `${n * 70}ms`, "--step": n } as React.CSSProperties}>
            <span className="ladder-level">{level}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
            <code>{gate}</code>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function KnowledgeBase({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const books: [string, string, string][] = pl
    ? [
        ["triage-and-severity.md", "Priorytety i waga", "CVSS, KEV, EPSS i kontekst. Co naprawić dziś, a co w przyszłym miesiącu."],
        ["software-vulnerabilities.md", "Luki w programach", "Od listy programów do planu aktualizacji ze źródłami."],
        ["endpoint-hardening.md", "Zabezpieczenie komputera", "Windows, macOS, Linux: szyfrowanie, zapora, konta, autostart."],
        ["web-application.md", "Strony i aplikacje WWW", "OWASP Top 10:2025, API, nagłówki, aplikacje z LLM."],
        ["code-review.md", "Przegląd kodu", "Od wejścia do wykonania: wstrzyknięcia, sekrety, łańcuch dostaw."],
        ["databases.md", "Bazy danych", "PostgreSQL, Supabase, MySQL, MongoDB, Redis. Tylko odczyt."],
        ["network.md", "Sieć", "Router, Wi-Fi, otwarte usługi, urządzenia IoT."],
        ["incident-first-response.md", "Pierwsza pomoc", "Phishing, przejęte konto, ransomware, wyciek klucza."],
        ["sources.md", "Źródła", "Standardy i otwarte repozytoria, z których powstała wiedza."],
      ]
    : [
        ["triage-and-severity.md", "Triage & severity", "CVSS, KEV, EPSS and context. What to fix today and what next month."],
        ["software-vulnerabilities.md", "Software vulnerabilities", "From a program list to a sourced update plan."],
        ["endpoint-hardening.md", "Endpoint hardening", "Windows, macOS, Linux: encryption, firewall, accounts, autostart."],
        ["web-application.md", "Web applications", "OWASP Top 10:2025, APIs, headers, LLM-powered apps."],
        ["code-review.md", "Code review", "From input to sink: injection, secrets, supply chain."],
        ["databases.md", "Databases", "PostgreSQL, Supabase, MySQL, MongoDB, Redis. Read-only."],
        ["network.md", "Network", "Router, Wi-Fi, exposed services, IoT devices."],
        ["incident-first-response.md", "First response", "Phishing, account takeover, ransomware, leaked keys."],
        ["sources.md", "Sources", "The standards and open repositories behind the knowledge."],
      ];
  return (
    <div className="knowledge-block" id="knowledge">
      <div className="knowledge-head" data-reveal>
        <span className="eyebrow"><BookOpen size={13} aria-hidden="true" />{pl ? "WIEDZA EKSPERTA W ŚRODKU" : "EXPERT KNOWLEDGE INSIDE"}</span>
        <h3>{pl ? "Dziewięć playbooków. Zero zgadywania." : "Nine playbooks. Zero guesswork."}</h3>
        <p>
          {pl
            ? "Opracowane na podstawie OWASP Top 10:2025, ASVS, CWE, CIS, NIST i CISA KEV oraz sprawdzonych otwartych repozytoriów. Każdy przeczytasz na GitHubie."
            : "Distilled from OWASP Top 10:2025, ASVS, CWE, CIS, NIST and CISA KEV, plus established open repositories. Read every one on GitHub."}
        </p>
      </div>
      <ul className="knowledge-grid" data-agent-target="Scout" data-agent-label={pl ? "Układanie bazy wiedzy" : "Indexing the knowledge base"}>
        {books.map(([file, title, text], n) => (
          <li key={file} data-reveal style={{ "--reveal-delay": `${(n % 3) * 70}ms` } as React.CSSProperties}>
            <a href={github(`${K}${file}`)} data-spot>
              <span className="mono">{String(n + 1).padStart(2, "0")}</span>
              <strong>{title}</strong>
              <small>{text}</small>
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
