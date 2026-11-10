import { ArrowUpRight } from "lucide-react";
import { asset, github, type Locale } from "@/lib/config";

const hosts = [
  {
    name: "Codex",
    logo: "codex",
    tone: "#f8fafc",
    entry: "$cyber-defense",
    label: ["Shared skill entry", "Gotowy punkt wejścia"],
  },
  {
    name: "Claude Code",
    logo: "claudecode",
    tone: "#f59e0b",
    entry: "/cyber-defense",
    label: ["Shared skill entry", "Gotowy punkt wejścia"],
  },
  {
    name: "Cursor",
    logo: "cursor",
    tone: "#f8fafc",
    entry: ".agents/skills",
    label: ["Skill format supported¹", "Zgodny format skilla¹"],
  },
  {
    name: "Antigravity",
    logo: "antigravity",
    tone: "#38bdf8",
    entry: ".agents/skills",
    label: ["Skill format supported¹", "Zgodny format skilla¹"],
  },
  {
    name: "Lovable",
    logo: "lovable",
    tone: "#fb7185",
    entry: "SKILL.md",
    label: ["Planning handoff", "Przekazanie planu"],
  },
  {
    name: "Hermes",
    logo: "hermesagent",
    tone: "#fbbf24",
    entry: ".hermes/skills",
    label: ["Experimental entry¹", "Wersja eksperymentalna¹"],
  },
];

export function HostWorkflows({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  return (
    <section
      className="host-workflows"
      id="agents"
      data-motion-region
      aria-labelledby="hosts-title"
    >
      <div className="section-shell">
        <div className="host-heading">
          <div>
            <span className="eyebrow">
              {pl ? "01 / UNIWERSALNA INTEGRACJA" : "01 / UNIVERSAL INTEGRATION"}
            </span>
            <h2 id="hosts-title">
              {pl ? "Jeden skill. Każdy agent." : "One skill. Every agent."}
            </h2>
            <p className="host-subtitle">
              {pl
                ? "Otwórz sklonowane repozytorium w swoim ulubionym agencie. Skill jest od razu widoczny — bez instalacji wtyczek i bez konfiguracji."
                : "Open the cloned repository in your favorite agent. The skill is immediately available — no plugins to install or configure."}
            </p>
          </div>
          <a className="host-compat-link" href={github("/blob/main/docs/HOST_COMPATIBILITY.md")}>
            {pl ? "Tabela zgodności" : "Compatibility matrix"}
            <ArrowUpRight size={15} />
          </a>
        </div>

        <div className="host-grid-wrapper">
          <div className="host-track">
            {hosts.map((host) => (
              <div className="host-item" key={host.name} data-spot>
                <div className="host-item-top">
                  <span
                    className="host-symbol host-logo"
                    aria-hidden="true"
                    style={
                      {
                        "--logo": `url(${asset(`/assets/hosts/${host.logo}.svg`)})`,
                        "--tone": host.tone,
                      } as React.CSSProperties
                    }
                  />
                  <code className="host-entry-pill">{host.entry}</code>
                </div>
                <div className="host-item-meta">
                  <strong>{host.name}</strong>
                  <small>{host.label[pl ? 1 : 0]}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="host-note">
          {pl
            ? "¹ Wspólna instrukcja w .agents/, .claude/ i .hermes/. Lokalne narzędzia CLI są przetestowane automatycznie; pełne sesje z modelami zależą od Twojego dostawcy."
            : "¹ Shared instructions in .agents/, .claude/ and .hermes/. Local CLI tools are tested automatically; full model sessions depend on your provider."}
        </p>
      </div>
    </section>
  );
}
