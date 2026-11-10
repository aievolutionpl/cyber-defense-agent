import { ArrowUpRight, Check, Database, FileCode2, Globe, Monitor, Siren, Wifi } from "lucide-react";
import { github, type Locale } from "@/lib/config";

const K = "/blob/main/skills/cyber-defense/references/knowledge/";
const missions = [
  {
    icon: Monitor,
    doc: "software-vulnerabilities.md",
    tool: "inventory → advisories",
    kind: ["CLI + PLAYBOOK", "CLI + PLAYBOOK"],
    title: ["Computer & server", "Komputer i serwer"],
    say: ["“Check my computer. What should I update?”", "„Sprawdź mój komputer. Co muszę zaktualizować?”"],
    points: [
      ["Lists installed programs and open ports on Windows, macOS and Linux", "Wypisuje zainstalowane programy i otwarte porty: Windows, macOS, Linux"],
      ["Checks known vulnerabilities in OSV.dev and flaws attackers use right now (CISA KEV)", "Sprawdza znane luki w OSV.dev i te, których atakujący używają teraz (CISA KEV)"],
      ["Researches risky desktop apps at the vendor, then orders the updates: what first, from where, how to undo", "Ryzykowne aplikacje bada u producenta i układa plan: co najpierw, skąd, jak cofnąć"],
    ],
  },
  {
    icon: Globe,
    doc: "web-application.md",
    tool: "web",
    kind: ["CLI + PLAYBOOK", "CLI + PLAYBOOK"],
    title: ["Website & web app", "Strona i aplikacja WWW"],
    say: ["“Is my website safe?”", "„Czy moja strona jest bezpieczna?”"],
    points: [
      ["HTTPS, HSTS, CSP, cookies, CORS, certificate", "HTTPS, HSTS, CSP, ciasteczka, CORS, certyfikat"],
      ["Passive only, like an ordinary browser visit", "Tylko pasywnie, jak zwykła wizyta przeglądarki"],
      ["Ready-to-paste header values for every gap", "Gotowe wartości nagłówków do każdej luki"],
    ],
  },
  {
    icon: FileCode2,
    doc: "code-review.md",
    tool: "deps · review · import",
    kind: ["CLI + PLAYBOOK", "CLI + PLAYBOOK"],
    title: ["Code & dependencies", "Kod i zależności"],
    say: ["“Review my project before release.”", "„Przejrzyj projekt przed wydaniem.”"],
    points: [
      ["Vulnerable packages from npm, PyPI, Cargo, Go, Composer and RubyGems lockfiles", "Podatne paczki z lockfile: npm, PyPI, Cargo, Go, Composer, RubyGems"],
      ["Secrets, disabled TLS checks, injection paths from input to sink", "Sekrety, wyłączony TLS, ścieżki wstrzyknięć od wejścia do wykonania"],
      ["Triage of Semgrep, Trivy and Gitleaks reports (SARIF)", "Porządkuje raporty Semgrep, Trivy i Gitleaks (SARIF)"],
    ],
  },
  {
    icon: Database,
    doc: "databases.md",
    tool: "read-only SQL",
    kind: ["PLAYBOOK", "PLAYBOOK"],
    title: ["Database", "Baza danych"],
    say: ["“Check my Supabase database.”", "„Sprawdź moją bazę w Supabase.”"],
    points: [
      ["Who can log in and what is reachable from the internet", "Kto może się zalogować i co widać z internetu"],
      ["Tables open to everyone: row-level security in Supabase and Firebase", "Tabele otwarte dla każdego: Row-Level Security w Supabase i Firebase"],
      ["Read-only queries. Row data never enters the chat", "Zapytania tylko do odczytu. Dane z wierszy nie trafiają do czatu"],
    ],
  },
  {
    icon: Wifi,
    doc: "network.md",
    tool: "inventory",
    kind: ["CLI + PLAYBOOK", "CLI + PLAYBOOK"],
    title: ["Home & office network", "Sieć domowa i firmowa"],
    say: ["“Is my network OK?”", "„Czy moja sieć jest w porządku?”"],
    points: [
      ["What this machine exposes to the network", "Co ten komputer wystawia do sieci"],
      ["Router: password, firmware, WPS, UPnP, port forwards", "Router: hasło, firmware, WPS, UPnP, przekierowania portów"],
      ["Unknown devices, guest and IoT separation", "Nieznane urządzenia, osobna sieć dla gości i IoT"],
    ],
  },
  {
    icon: Siren,
    doc: "incident-first-response.md",
    tool: "first response",
    kind: ["PLAYBOOK", "PLAYBOOK"],
    title: ["Something looks wrong", "Coś jest nie tak"],
    say: ["“I think I've been hacked.”", "„Chyba mnie zhakowano.”"],
    points: [
      ["What to do in the first five minutes, in order", "Co zrobić w pierwszych pięciu minutach, po kolei"],
      ["What not to touch so evidence survives", "Czego nie ruszać, żeby nie zniszczyć dowodów"],
      ["Phishing, account takeover, ransomware, leaked keys", "Phishing, przejęte konto, ransomware, wyciek klucza"],
    ],
  },
];

export function Missions({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const i = pl ? 1 : 0;
  return (
    <section data-build-section className="missions-section section-shell" id="missions" aria-labelledby="missions-title">
      <div className="section-heading" data-reveal>
        <div>
          <span className="eyebrow">{pl ? "CO SPRAWDZI TWÓJ AGENT" : "WHAT YOUR AGENT WILL CHECK"}</span>
          <h2 id="missions-title">
            {pl ? "Jeden skill." : "One skill."}
            <br />
            <span className="gradient-text">{pl ? "Sześć obszarów ochrony." : "Six areas of protection."}</span>
          </h2>
        </div>
        <p>
          {pl
            ? "Powiedz zwykłym zdaniem, co chcesz chronić. Agent wie, od czego zacząć, o co zapytać i jak to sprawdzić."
            : "Say what you want to protect in plain words. Your agent knows where to start, what to ask and how to check it."}
        </p>
      </div>
      <div className="missions-grid" data-agent-target="Architect" data-agent-label={pl ? "Mapowanie obszarów ochrony" : "Mapping protection areas"}>
        {missions.map(({ icon: Icon, doc, tool, kind, title, say, points }, n) => (
          <article key={doc} className="mission-card" data-area={doc.split("-")[0].replace(".md", "")} data-spot data-reveal style={{ "--reveal-delay": `${(n % 3) * 90}ms` } as React.CSSProperties}>
            <div className="mission-top">
              <span className="mission-icon">
                <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span className="mission-kind">{kind[i]}</span>
            </div>
            <h3>{title[i]}</h3>
            <p className="mission-say">{say[i]}</p>
            <ul>
              {points.map((point) => (
                <li key={point[0]}>
                  <Check size={14} aria-hidden="true" />
                  {point[i]}
                </li>
              ))}
            </ul>
            <div className="mission-foot">
              <code>{tool}</code>
              <a href={github(`${K}${doc}`)} aria-label={`${pl ? "Playbook" : "Playbook"}: ${title[i]}`}>
                {pl ? "Playbook" : "Playbook"}
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
          </article>
        ))}
      </div>
      <p className="missions-note" data-reveal>
        {pl
          ? "Automatyczne sprawdzanie luk obejmuje pakiety systemowe Linuksa i zależności projektów. Aplikacje desktopowe Windows i macOS agent bada w źródłach producenta i podaje, skąd wie. Brak ustaleń nie oznacza, że system jest bezpieczny."
          : "Automatic vulnerability lookup covers Linux system packages and project dependencies. Windows and macOS desktop apps are researched at the vendor's sources, with citations. No findings does not mean a system is secure."}
      </p>
    </section>
  );
}
