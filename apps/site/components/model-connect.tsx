import { ArrowUpRight, Check, Cpu, KeyRound, LockKeyhole, Terminal } from "lucide-react";
import { github, type Locale } from "@/lib/config";

type Provider = {
  id: string;
  name: string;
  kind: "sub" | "api" | "local";
  how: [string, string];
  command: string;
};

const providers: Provider[] = [
  { id: "claude-code", name: "Claude Code", kind: "sub", how: ["Your Claude Pro/Max subscription through the logged-in CLI.", "Twoja subskrypcja Claude Pro/Max przez zalogowane CLI."], command: "connect --provider claude-code" },
  { id: "codex", name: "OpenAI Codex", kind: "sub", how: ["Your ChatGPT Plus/Pro subscription via codex exec, read-only sandbox.", "Twoja subskrypcja ChatGPT Plus/Pro przez codex exec w trybie read-only."], command: "connect --provider codex" },
  { id: "openrouter", name: "OpenRouter", kind: "api", how: ["One key, hundreds of models. Key from OPENROUTER_API_KEY.", "Jeden klucz, setki modeli. Klucz z OPENROUTER_API_KEY."], command: "connect --provider openrouter --key-stdin" },
  { id: "anthropic", name: "Claude API", kind: "api", how: ["Anthropic API key from ANTHROPIC_API_KEY. Default claude-opus-5-5.", "Klucz Anthropic z ANTHROPIC_API_KEY. Domyślnie claude-opus-5-5."], command: "connect --provider anthropic" },
  { id: "openai", name: "OpenAI API", kind: "api", how: ["OpenAI API key from OPENAI_API_KEY.", "Klucz OpenAI z OPENAI_API_KEY."], command: "connect --provider openai" },
  { id: "ollama", name: "Ollama", kind: "local", how: ["A local model on 127.0.0.1. Nothing leaves your computer.", "Lokalny model na 127.0.0.1. Nic nie opuszcza komputera."], command: "connect --provider ollama --model llama3.2" },
];

export function ModelConnect({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const i = pl ? 1 : 0;
  const kind = {
    sub: pl ? "SUBSKRYPCJA" : "SUBSCRIPTION",
    api: pl ? "KLUCZ API" : "API KEY",
    local: pl ? "LOKALNIE" : "LOCAL",
  };
  const guarantees = pl
    ? ["Model nie ma narzędzi, plików ani powłoki", "Wysyłany jest tylko skrócony, zredagowany opis ustaleń", "--dry-run pokazuje dokładnie, co wyjdzie z komputera", "Odpowiedź zawsze oznaczona jako ocena modelu"]
    : ["The model gets no tools, files or shell", "Only a bounded, redacted brief of findings is sent", "--dry-run shows exactly what would leave the machine", "Every answer is labelled model judgment"];
  return (
    <section data-build-section className="model-section section-shell" id="model" aria-labelledby="model-title">
      <div className="section-heading" data-reveal>
        <div>
          <span className="eyebrow">{pl ? "06 / TWÓJ MODEL" : "06 / YOUR MODEL"}</span>
          <h2 id="model-title">
            {pl ? "Skill w agencie." : "A skill in your agent."}
            <br />
            <span className="gradient-text">{pl ? "Albo samodzielny program." : "Or a standalone program."}</span>
          </h2>
        </div>
        <p>
          {pl
            ? "Podłącz subskrypcję Claude lub ChatGPT, klucz OpenRouter albo lokalny model. CLI zbiera dowody, a model tłumaczy je prostym językiem, odpowiada na pytania i układa plan naprawy — w terminalu (chat) i w lokalnym panelu (ui)."
            : "Plug in your Claude or ChatGPT subscription, an OpenRouter key or a local model. The CLI collects evidence; the model explains it in plain language, answers questions and plans the fix — in the terminal (chat) and the local panel (ui)."}
        </p>
      </div>
      <div className="model-layout">
        <ul className="provider-cards" data-agent-target="Builder" data-agent-label={pl ? "Podłączanie modeli" : "Connecting models"}>
          {providers.map((p) => (
            <li key={p.id} className="provider-card" data-kind={p.kind}>
              <div className="provider-top">
                <span className="provider-icon" aria-hidden="true">
                  {p.kind === "sub" ? <Terminal size={18} /> : p.kind === "api" ? <KeyRound size={18} /> : <Cpu size={18} />}
                </span>
                <span className="provider-kind">{kind[p.kind]}</span>
              </div>
              <h3>{p.name}</h3>
              <p>{p.how[i]}</p>
              <code>{p.command}</code>
            </li>
          ))}
        </ul>
        <div className="model-terminal" data-agent-target="Verifier" data-agent-label={pl ? "Weryfikacja granic" : "Checking boundaries"}>
          <div className="window-bar">
            <span className="window-dots" aria-hidden="true"><i /><i /><i /></span>
            <span>cda · model bridge</span>
          </div>
          <pre>
            <code>
              <span className="t-dim"># {pl ? "1. sprawdź środowisko (bez sieci)" : "1. check the environment (no network)"}</span>{"\n"}
              <span className="t-cmd">node tools/cda.mjs doctor</span>{"\n\n"}
              <span className="t-dim"># {pl ? "2. wybierz model" : "2. choose a model"}</span>{"\n"}
              <span className="t-cmd">node tools/cda.mjs connect --provider claude-code</span>{"\n\n"}
              <span className="t-dim"># {pl ? "3. zobacz, co zostanie wysłane" : "3. preview what would be sent"}</span>{"\n"}
              <span className="t-cmd">node tools/cda.mjs explain --from audit --dry-run</span>{"\n\n"}
              <span className="t-dim"># {pl ? "4. wyjaśnij wyniki za zgodą" : "4. explain results with consent"}</span>{"\n"}
              <span className="t-cmd">node tools/cda.mjs explain --from audit --send-summary</span>{"\n"}
              <span className="t-ok">✓ .cda/reports/explain-….md · model judgment</span>{"\n\n"}
              <span className="t-dim"># {pl ? "5. rozmowa z ekspertem" : "5. talk to the expert"}</span>{"\n"}
              <span className="t-cmd">node tools/cda.mjs chat</span>
            </code>
          </pre>
          <ul className="model-guarantees">
            {guarantees.map((g) => (
              <li key={g}><Check size={14} aria-hidden="true" />{g}</li>
            ))}
          </ul>
          <a className="subtle-link" href={github("/blob/main/docs/MODEL_PROVIDERS.md")}>
            <LockKeyhole size={15} aria-hidden="true" />
            {pl ? "Jak działa połączenie z modelem" : "How the model connection works"}
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
