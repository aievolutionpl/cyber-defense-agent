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
    say: ["“Check my computer. What should I update?”", "„Sprawdź mój komputer. Co zaktualizować?”"],
    points: [
      ["Installed apps and open ports (Windows, macOS, Linux)", "Zainstalowane programy i otwarte porty (Win, macOS, Linux)"],
      ["Live vulnerability check via OSV.dev & CISA KEV", "Znane luki w OSV.dev i aktywne ataki (CISA KEV)"],
      ["Prioritized update plan with safe rollback steps", "Uporządkowany plan aktualizacji z opcją cofnięcia"],
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
      ["HTTPS, HSTS, CSP, cookies, CORS & TLS certificate", "HTTPS, HSTS, CSP, ciasteczka, CORS i certyfikat TLS"],
      ["100% passive check — like a normal browser visit", "W 100% pasywnie — jak zwykła wizyta przeglądarki"],
      ["Ready-to-paste security header configs", "Gotowe do wklejenia konfiguracje nagłówków"],
    ],
  },
  {
    icon: FileCode2,
    doc: "code-review.md",
    tool: "deps · review · import",
    kind: ["CLI + PLAYBOOK", "CLI + PLAYBOOK"],
    title: ["Code & dependencies", "Kod i zależności"],
    say: ["“Review my project before release.”", "„Sprawdź projekt przed wdrożeniem.”"],
    points: [
      ["6 lockfile formats (npm, PyPI, Cargo, Go, Composer, Ruby)", "6 formatów lockfile (npm, PyPI, Cargo, Go, Composer, Ruby)"],
      ["Leaked secrets, unsafe eval/XSS, agent rules & TLS", "Wycieki sekretów, XSS/eval, reguły agentów i TLS"],
      ["Imports & deduplicates Semgrep, Trivy, Gitleaks (SARIF)", "Import i deduplikacja raportów Semgrep, Trivy, Gitleaks"],
    ],
  },
  {
    icon: Database,
    doc: "databases.md",
    tool: "read-only SQL",
    kind: ["PLAYBOOK", "PLAYBOOK"],
    title: ["Database", "Baza danych"],
    say: ["“Check my Supabase database.”", "„Sprawdź moją bazę Supabase / Postgres.”"],
    points: [
      ["Public exposure, roles and login permissions", "Ekspozycja w sieci, role i uprawnienia logowania"],
      ["Row-Level Security (RLS) gaps in Supabase & Firebase", "Luki Row-Level Security (RLS) w Supabase i Firebase"],
      ["Strictly read-only metadata — row data stays private", "Wyłącznie odczyt metadanych — bez pobierania rekordów"],
    ],
  },
  {
    icon: Wifi,
    doc: "network.md",
    tool: "inventory",
    kind: ["CLI + PLAYBOOK", "CLI + PLAYBOOK"],
    title: ["Home & office network", "Sieć domowa i firmowa"],
    say: ["“Is my network OK?”", "„Czy moja sieć jest bezpieczna?”"],
    points: [
      ["Services and ports exposed by your machine", "Usługi i porty wystawione przez Twój komputer"],
      ["Router checklist: DNS, WPS, UPnP, port forwarding", "Lista kontrolna routera: DNS, WPS, UPnP, przekierowania"],
      ["Wi-Fi segmentation for guests and IoT devices", "Separacja sieci Wi-Fi dla gości i urządzeń IoT"],
    ],
  },
  {
    icon: Siren,
    doc: "incident-first-response.md",
    tool: "first response",
    kind: ["PLAYBOOK", "PLAYBOOK"],
    title: ["Incident response", "Nagły incydent"],
    say: ["“I think I've been hacked.”", "„Podejrzewam włamanie lub wyciek.”"],
    points: [
      ["First 5 minutes: step-by-step containment plan", "Pierwsze 5 minut: plan działania krok po kroku"],
      ["How to isolate threats without destroying evidence", "Jak odciąć zagrożenie bez niszczenia dowodów"],
      ["Leaked API keys, account takeover & phishing triage", "Wyciek kluczy API, przejęte konta i phishing"],
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
          <span className="eyebrow">{pl ? "02 / ZAKRES OCHRONY" : "02 / PROTECTION SCOPE"}</span>
          <h2 id="missions-title">
            {pl ? "Napisz jedno zdanie." : "Ask in plain words."}
            <br />
            <span className="gradient-text">{pl ? "Sześć obszarów audytu." : "Six areas of protection."}</span>
          </h2>
        </div>
        <p>
          {pl
            ? "Nie musisz znać komend skanerów. Powiedz agentowi, co chcesz sprawdzić — skill dobierze odpowiednie narzędzie i playbook."
            : "No scanner flags to memorize. Tell your agent what to check — the skill selects the right local tool and playbook."}
        </p>
      </div>
      <div className="missions-grid" data-agent-target="Architect" data-agent-label={pl ? "Mapowanie obszarów ochrony" : "Mapping protection areas"}>
        {missions.map(({ icon: Icon, doc, tool, kind, title, say, points }, n) => (
          <article key={doc} className="mission-card" data-area={doc.split("-")[0].replace(".md", "")} data-spot data-reveal style={{ "--reveal-delay": `${(n % 3) * 80}ms` } as React.CSSProperties}>
            <div className="mission-top">
              <span className="mission-icon">
                <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
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
              <a href={github(`${K}${doc}`)} aria-label={`Playbook: ${title[i]}`}>
                Playbook
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
