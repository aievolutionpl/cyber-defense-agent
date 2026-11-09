import { ArrowUpRight } from "lucide-react";
import { github, type Locale } from "@/lib/config";

const hosts = [
  {
    name: "Codex",
    mark: "›_",
    label: ["Shared skill entry", "Wspólny punkt wejścia"],
  },
  {
    name: "Claude Code",
    mark: "✳",
    label: ["Shared skill entry", "Wspólny punkt wejścia"],
  },
  {
    name: "Cursor",
    mark: "↗",
    label: ["Skill format supported¹", "Obsługiwany format skilla¹"],
  },
  {
    name: "Antigravity",
    mark: "A",
    label: ["Skill format supported¹", "Obsługiwany format skilla¹"],
  },
  {
    name: "Lovable",
    mark: "L",
    label: ["Planning handoff only", "Tylko przekazanie planu"],
  },
  {
    name: "Hermes",
    mark: "H",
    label: ["Experimental entry¹", "Eksperymentalny punkt wejścia¹"],
  },
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
          {pl ? "Jeden skill. Twój workflow." : "One skill. Your workflow."}
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
                  <span className="host-symbol">{host.mark}</span>
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
      <p className="section-shell host-note">
        {pl
          ? "¹ Zgodność formatu lub instrukcja wdrożenia, nie potwierdzona sesja modelowa. Wszystkie sesje z modelami pozostają niezweryfikowane. Nazwy nie oznaczają partnerstwa."
          : "¹ Format support or setup guidance, not a verified model session. All end-to-end model sessions remain unverified. Names do not imply endorsement."}
      </p>
    </section>
  );
}
