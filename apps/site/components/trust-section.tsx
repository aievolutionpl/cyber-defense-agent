import { ArrowUpRight, Code2, LockKeyhole, UserCheck } from "lucide-react";
import { asset, github, type Locale } from "@/lib/config";

export function TrustSection({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const principles = pl
    ? [
        {
          icon: Code2,
          title: "Kod do wglądu.",
          text: "Skill, narzędzia, testy i zależności są publiczne. Możesz sprawdzić reguły i uruchomić testy samodzielnie.",
        },
        {
          icon: UserCheck,
          title: "Ty kontrolujesz uprawnienia.",
          text: "Dla doświadczonych operatorów agentów AI. Używaj tylko danych, które masz prawo analizować, i sprawdzaj proponowane poprawki.",
        },
        {
          icon: LockKeyhole,
          title: "Jasny przepływ danych.",
          text: "Lokalny CLI nie wysyła danych. Host agenta może przekazać treść rozmowy dostawcy modelu. Strona nie używa analityki ani cookies aplikacji.",
        },
      ]
    : [
        {
          icon: Code2,
          title: "Open to inspection.",
          text: "The skill, tools, tests and dependencies are public. Inspect the rules, pin a revision and run the checks yourself.",
        },
        {
          icon: UserCheck,
          title: "You control permissions.",
          text: "For experienced AI-agent operators. Review only data you are authorized to inspect, and verify proposed changes before applying them.",
        },
        {
          icon: LockKeyhole,
          title: "Know where data goes.",
          text: "The local CLI sends nothing. Your agent host may share conversation content with its model provider. This site has no analytics or application cookies.",
        },
      ];
  return (
    <section
      className="trust-section section-shell"
      id="trust"
      aria-labelledby="trust-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {pl
              ? "OTWARTY KOD / ŚWIADOME DECYZJE"
              : "OPEN SOURCE / INFORMED CONTROL"}
          </span>
          <h2 id="trust-title">
            {pl ? "Sprawdź, zanim zaufasz." : "Inspect before you trust."}
          </h2>
        </div>
        <a
          className="subtle-link"
          href={github("/blob/main/docs/RESPONSIBLE_USE.md")}
        >
          {pl ? "Zasady odpowiedzialnego użycia" : "Operator responsibilities"}
          <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="trust-grid">
        {principles.map(({ icon: Icon, title, text }) => (
          <article key={title}>
            <Icon size={24} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="responsibility-note">
        <p>
          {pl
            ? "Oprogramowanie udostępniamy „tak jak jest”, bez gwarancji. Wyniki nie stanowią certyfikatu bezpieczeństwa. Ponosisz odpowiedzialność za zakres, uprawnienia, udostępniane dane i własne działania, w granicach obowiązującego prawa."
            : "Provided as is, without warranty. Findings are not a security certification. You are responsible for scope, permissions, data disclosure and your actions, subject to applicable law."}
        </p>
        <a href={asset(pl ? "/pl/policies/" : "/policies/")}>
          {pl
            ? "Prywatność, cookies i zasady użycia"
            : "Privacy, cookies & responsible use"}
          <ArrowUpRight size={15} />
        </a>
      </div>
    </section>
  );
}
