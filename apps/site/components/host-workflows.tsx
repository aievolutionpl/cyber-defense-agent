import { ArrowUpRight } from "lucide-react";
import { asset, github, type Locale } from "@/lib/config";

const hosts = [
  { name: "Codex", logo: "codex", tone: "#f4f7f5", label: ["Shared skill entry", "Wspólny punkt wejścia"] },
  { name: "Claude Code", logo: "claudecode", tone: "#e58a68", label: ["Shared skill entry", "Wspólny punkt wejścia"] },
  { name: "Cursor", logo: "cursor", tone: "#f4f7f5", label: ["Skill format supported¹", "Obsługiwany format skilla¹"] },
  { name: "Antigravity", logo: "antigravity", tone: "#7fb2ff", label: ["Skill format supported¹", "Obsługiwany format skilla¹"] },
  { name: "Lovable", logo: "lovable", tone: "#ff7a59", label: ["Planning handoff only", "Tylko przekazanie planu"] },
  { name: "Hermes", logo: "hermesagent", tone: "#f2d27a", label: ["Experimental entry¹", "Eksperymentalny punkt wejścia¹"] },
];

export function HostWorkflows({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  return (
    <section
      className="host-workflows"
      data-motion-region
      aria-labelledby="hosts-title"
    >
      <div className="section-shell host-heading">
        <h2 id="hosts-title">
          {pl ? "Jeden skill. Każdy agent." : "One skill. Every agent."}
        </h2>
        <a href={github("/blob/main/docs/HOST_COMPATIBILITY.md")}>
          {pl ? "Sprawdź zgodność" : "Check compatibility"}
          <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="host-marquee">
        <div className="host-track">
          {[0, 1].map((copy) => (
            <div
              className="host-group"
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {hosts.map((host) => (
                <div className="host-item" key={host.name}>
                  <span
                    className="host-symbol host-logo"
                    aria-hidden="true"
                    style={{ "--logo": `url(${asset(`/assets/hosts/${host.logo}.svg`)})`, "--tone": host.tone } as React.CSSProperties}
                  />
                  <div>
                    <strong>{host.name}</strong>
                    <small>{host.label[pl ? 1 : 0]}</small>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="section-shell host-auto">
        {pl
          ? "Sklonuj repozytorium i otwórz je w swoim agencie. Punkty wejścia .agents/, .claude/ i .hermes/ prowadzą do tej samej instrukcji, więc skill jest od razu widoczny, bez instalacji i konfiguracji."
          : "Clone the repository and open it in your agent. The .agents/, .claude/ and .hermes/ entry points lead to the same instruction, so the skill is visible at once, with nothing to install or configure."}
      </p>
      <p className="section-shell host-note">
        {pl
          ? "¹ Zgodność formatu lub instrukcja wdrożenia, nie potwierdzona sesja modelowa. Wszystkie sesje z modelami pozostają niezweryfikowane. Nazwy nie oznaczają partnerstwa."
          : "¹ Format support or setup guidance, not a verified model session. All end-to-end model sessions remain unverified. Names do not imply endorsement."}
      </p>
    </section>
  );
}
