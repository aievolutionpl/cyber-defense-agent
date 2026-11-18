/**
 * Interactive security assistant in the terminal: `node tools/cda.mjs chat`.
 * The model has no tools. It answers questions and explains stored reports through the
 * bounded brief from providers.mjs. Each brief transmission is confirmed separately.
 */
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readStoredReports } from "./panel-api.mjs";
import { PROVIDERS, callModel, systemPrompt, buildBrief, briefPrompt, sanitizeModelMarkdown, validateProvider, validateModelName } from "./providers.mjs";

const c = {
  em: (s) => `\x1b[38;2;52;211;153m${s}\x1b[0m`,
  cy: (s) => `\x1b[38;2;56;189;248m${s}\x1b[0m`,
  am: (s) => `\x1b[38;2;251;191;36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
};

const T = {
  pl: {
    title: "CYBER DEFENSE AGENT — CZAT Z EKSPERTEM BEZPIECZEŃSTWA",
    consent: (p) => `Wiadomości, które wpiszesz, zostaną wysłane do: ${p}. Model nie ma narzędzi ani dostępu do plików. Kontynuować? [t/N] `,
    declined: "Bez zgody nic nie zostało wysłane. Do zobaczenia.",
    help: "Komendy: /reports · /explain <raport> [raport…] · /provider <id> · /model <nazwa> · /clear · /exit",
    thinking: "⏳ model myśli…",
    briefConsent: (n, t) => `Wyślę skrócony opis ${n} z ${t} ustaleń (priorytet, obszar, tytuł, wskazówka naprawy; bez plików i dowodów). Wysłać? [t/N] `,
    noReports: "Brak raportów w .cda/reports. Uruchom najpierw: node tools/demo.mjs",
    you: "ty",
    kept: (p) => `Bez zmian: nadal ${p}.`,
    excluded: (n, x) => `Użyję ${n} najnowszych raportów; pominięto ${x} starszych (podaj nazwy: /explain <raport>).`,
    cleared: "historia rozmowy wyczyszczona",
  },
  en: {
    title: "CYBER DEFENSE AGENT — SECURITY EXPERT CHAT",
    consent: (p) => `Messages you type will be sent to: ${p}. The model has no tools and no file access. Continue? [y/N] `,
    declined: "Nothing was sent without consent. Bye.",
    help: "Commands: /reports · /explain <report> [report…] · /provider <id> · /model <name> · /clear · /exit",
    thinking: "⏳ model is thinking…",
    briefConsent: (n, t) => `I will send a bounded brief of ${n} of ${t} findings (priority, area, title, fix hint; no files or evidence). Send? [y/N] `,
    noReports: "No reports in .cda/reports. Run first: node tools/demo.mjs",
    you: "you",
    kept: (p) => `Unchanged: still ${p}.`,
    excluded: (n, x) => `Using the ${n} newest reports; ${x} older ones left out (name them: /explain <report>).`,
    cleared: "conversation history cleared",
  },
};

const HISTORY_BUDGET = 45000;

/** Keep the newest complete turns that fit the transport's character budget; start on a user turn. */
export function fitHistory(history, budget = HISTORY_BUDGET) {
  const kept = [];
  let size = 0;
  for (let i = history.length - 1; i >= 0 && kept.length < 20; i -= 1) {
    const len = String(history[i].content).length;
    if (size + len > budget && kept.length) break;
    kept.unshift(history[i]);
    size += len;
  }
  while (kept.length > 1 && kept[0].role !== "user") kept.shift();
  return kept;
}

const yes = (answer) => /^(t|tak|y|yes)$/i.test(String(answer).trim());

export async function chatTerminal({ provider, model, lang = "pl", store, rl: injected = null, call = callModel } = {}) {
  if (!injected && (!input.isTTY || !output.isTTY)) throw new Error("INTERACTIVE_TERMINAL_REQUIRED");
  const t = T[lang === "en" ? "en" : "pl"];
  const rl = injected ?? readline.createInterface({ input, output });
  let current = { provider: validateProvider(provider), model: validateModelName(model) };
  const label = () => `${current.provider}${current.model ? ` · ${current.model}` : PROVIDERS[current.provider].defaultModel ? ` · ${PROVIDERS[current.provider].defaultModel}` : ""}`;
  const history = [];
  const say = (s = "") => output.write(`${s}\n`);
  try {
    say(`\n${c.em("╭─")} 🛡️  ${c.b(t.title)}\n${c.em("│")}  ${c.cy(label())}\n${c.em("╰─")} ${c.dim(t.help)}\n`);
    if (!yes(await rl.question(c.am(t.consent(label()))))) { say(t.declined); return { sent: 0 }; }
    let sent = 0;
    const ask = async (content) => {
      history.push({ role: "user", content });
      say(c.dim(t.thinking));
      try {
        const res = await call({ provider: current.provider, model: current.model, system: systemPrompt(lang), messages: fitHistory(history), consent: true });
        const text = sanitizeModelMarkdown(res.text);
        history.push({ role: "assistant", content: text });
        sent += 1;
        say(`\n${c.em("◆")} ${text}\n${c.dim(`— ${res.provider} · ${res.model} · ${(res.ms / 1000).toFixed(1)}s · model judgment`)}\n`);
      } catch (error) {
        history.pop();
        say(c.am(`✗ ${error.code ?? "MODEL_CALL_FAILED"}${error.detail ? ` — ${error.detail}` : ""}`));
      }
    };
    for (;;) {
      let line;
      try { line = (await rl.question(`${c.cy(t.you)} › `)).trim(); } catch { break; }
      if (!line) continue;
      if (line === "/exit" || line === "/quit") break;
      if (line === "/help") { say(t.help); continue; }
      if (line === "/clear") { history.length = 0; say("✓"); continue; }
      if (line === "/reports") {
        const names = store.list("reports");
        say(names.length ? names.map((n) => `  • ${n}`).join("\n") : t.noReports);
        continue;
      }
      if (line.startsWith("/provider ")) {
        let next;
        try { next = validateProvider(line.slice(10).trim()); } catch { say(Object.keys(PROVIDERS).join(" · ")); continue; }
        const previous = current;
        current = { provider: next, model: null };
        // A new destination needs its own consent; earlier messages were approved only for the old one.
        if (!yes(await rl.question(c.am(t.consent(label()))))) { current = previous; say(t.kept(label())); continue; }
        history.length = 0;
        say(`✓ ${label()} · ${t.cleared}`);
        continue;
      }
      if (line.startsWith("/model ")) {
        try { current.model = validateModelName(line.slice(7).trim()); say(`✓ ${label()}`); } catch { say("✗ INVALID_MODEL_NAME"); }
        continue;
      }
      if (line.startsWith("/explain")) {
        const names = line.split(/\s+/).slice(1).filter(Boolean).slice(0, 20);
        const named = [];
        let excluded = 0;
        if (!names.length && store.repoRoot) {
          // Newest first through the same link-safe reader as the panel; older reports are reported, not hidden.
          const all = readStoredReports(store.repoRoot, 500);
          for (const [n, r] of all.slice(0, 20)) named.push([n, r]);
          excluded = Math.max(0, all.length - named.length);
        } else {
          for (const n of names.length ? names : store.list("reports").slice(0, 20)) { try { named.push([n, store.read("reports", n)]); } catch { /* skip */ } }
        }
        if (excluded) say(c.dim(t.excluded(named.length, excluded)));
        const brief = buildBrief(named);
        if (!brief.coverage.sources) { say(t.noReports); continue; }
        if (!yes(await rl.question(c.am(t.briefConsent(brief.included, brief.total))))) continue;
        await ask(briefPrompt(brief, lang));
        continue;
      }
      await ask(line);
    }
    return { sent };
  } finally {
    if (!injected) rl.close();
  }
}
