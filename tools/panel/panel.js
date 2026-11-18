// Cyber Defense Agent · Command Center. No external code; every dynamic string is escaped.
const TOKEN = document.querySelector('meta[name="cda-token"]').content;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const I18N = {
  pl: {
    skip: "Przejdź do treści", guard: "127.0.0.1 · tylko odczyt · token sesji", refresh: "Odśwież (R)",
    "nav.overview": "Przegląd", "nav.audit": "Audyt", "nav.findings": "Ustalenia", "nav.expert": "Ekspert AI", "nav.agents": "Agenci CLI", "nav.reports": "Raporty", "nav.system": "System",
    "score.label": "wskaźnik", "score.note": "Wskaźnik pomocniczy z otwartych ustaleń (P0 −30, P1 −12, P2 −4, P3 −1). To nie certyfikat bezpieczeństwa.",
    "hero.eyebrow": "STAN OCHRONY", "act.demo": "▶ Uruchom demo", "act.audit": "Nowy audyt", "act.explain": "🧠 Wyjaśnij z AI", "act.dashboard": "Dashboard ↗",
    "kpi.P0": "działaj dziś", "kpi.P1": "w tym tygodniu", "kpi.P2": "zaplanuj", "kpi.P3": "przy okazji", "kpi.fixed": "potwierdzone poprawki", "kpi.sources": "źródła dowodów",
    "ov.top": "Najważniejsze ustalenia", "ov.all": "Wszystkie →", "ov.areas": "Obszary", "ov.coverage": "Pokrycie",
    "ov.empty": "Brak raportów. Uruchom demo albo pierwszy audyt.", "ov.noAreas": "Brak otwartych ustaleń w obszarach.",
    "cov.sources": "Źródła", "cov.packages": "Pakiety w inwentarzu", "cov.checked": "Sprawdzone w bazach luk", "cov.notChecked": "Do ręcznej weryfikacji", "cov.files": "Pliki w zakresie", "cov.incomplete": "Niepełne źródła", "cov.updated": "Ostatnia zmiana",
    "verdict.act": "Działaj dziś", "verdict.attention": "Wymaga uwagi w tym tygodniu", "verdict.routine": "Rutynowa konserwacja", "verdict.clear": "Brak ustaleń w sprawdzonym zakresie", "verdict.incomplete": "Niepełne pokrycie", "verdict.none": "Jeszcze nic nie sprawdzono",
    "verdictText.act": "Są ustalenia P0. Zacznij od nich — poniżej masz dokładne poprawki.", "verdictText.attention": "Brak P0, ale są pilne P1. Zaplanuj poprawki w tym tygodniu.", "verdictText.routine": "Tylko rutynowe ustalenia P2/P3. Dobry moment na porządki.", "verdictText.clear": "Narzędzia nic nie znalazły w sprawdzonym zakresie. To nie dowód pełnego bezpieczeństwa.", "verdictText.incomplete": "Część sprawdzeń się nie udała — uruchom je ponownie, zanim uznasz wynik.", "verdictText.none": "Zacznij od bezpiecznego demo na danych syntetycznych albo wybierz cel audytu.",
    "audit.eyebrow": "PROWADZONY AUDYT", "audit.title": "Co chcesz dziś sprawdzić?", "audit.target": "Ścieżka projektu lub adres URL", "audit.consent.t": "Zgoda na ten krok", "audit.start": "▶ Rozpocznij audyt", "audit.cancel": "⏹ Anuluj", "audit.resume": "↻ Wznów", "audit.active": "Bieżące uruchomienie", "audit.history": "Historia", "audit.noRun": "Brak uruchomień. Wybierz cel i zacznij.",
    "wf.pc": "Komputer", "wf.pc.d": "Programy, porty, znane luki CVE", "wf.project": "Projekt", "wf.project.d": "Kod, sekrety, zależności", "wf.web": "Strona WWW", "wf.web.d": "HTTPS, nagłówki, cookies, TLS", "wf.demo": "Demo", "wf.demo.d": "Dane syntetyczne, bez ryzyka",
    "consent.pc": "Zgadzam się na lokalny odczyt listy programów i otwartych portów.", "consent.project": "Zgadzam się na przygotowanie zakresu dla podanych plików.", "consent.web": "Potwierdzam, że to moja strona lub mam zgodę właściciela; wykonam kilka pasywnych zapytań GET (--authorized).", "consent.demo": "Demo działa na danych syntetycznych — zgoda nie jest potrzebna.",
    "audit.files": "Ścieżki względne, po jednej w wierszu", "audit.approve": "Zatwierdź krok", "audit.scope": "Zatwierdź odczyt poniższych plików.", "audit.share": "Wyślij nazwy i wersje pakietów do OSV.dev oraz pobierz listę CISA KEV.", "t.files": "Podaj dokładne ścieżki plików.",
    "st.awaiting_approval": "czeka na zgodę",
    "audit.progress": "Postęp audytu", "audit.filter": "Filtruj historię według stanu", "audit.all": "Wszystkie stany", "audit.noMatches": "Brak uruchomień dla tego stanu.", "t.target": "Podaj katalog projektu.",
    "ag.m.changes": "Przegląd zmian", "ag.m.retest": "Plan retestu", "ag.m.ocr": "Plan użycia OpenCodeReview", "ag.preview": "Podgląd promptu",
    "rp.search": "Szukaj raportów", "rp.format": "Format raportu", "rp.allFormats": "Wszystkie formaty", "rp.noMatches": "Brak raportów dla tych filtrów.", "t.network": "Nie udało się połączyć z lokalnym panelem.",
    "target.project": "Ścieżka projektu", "target.web": "Adres strony (https://…)",
    "f.search": "Szukaj w ustaleniach… ( / )", "f.all": "Wszystkie", "f.ideas": "Pomysły", "f.allAreas": "Wszystkie obszary", "f.export": "⇩ Eksport Markdown", "f.area": "Obszar",
    "f.summary": "Pokazano {n} z {t} ustaleń", "f.none": "Brak ustaleń dla tych filtrów.", "f.impact": "Wpływ", "f.evidence": "Dowód", "f.fix": "Poprawka", "f.verify": "Weryfikacja", "f.source": "Źródło", "f.ask": "🧠 Zapytaj eksperta", "f.copy": "Kopiuj poprawkę", "f.model": "ocena modelu", "f.reopened": "wróciło",
    "ex.eyebrow": "TWÓJ MODEL", "ex.title": "Podłącz model", "ex.lead": "Subskrypcja (Claude Code, Codex), klucz API (OpenRouter, Anthropic, OpenAI) albo lokalna Ollama. Model nie ma narzędzi ani plików.", "ex.model": "Model (opcjonalnie)", "ex.model.ph": "domyślny dla dostawcy", "ex.save": "💾 Zapamiętaj wybór", "ex.consent.t": "Zgoda na wysyłanie", "ex.consent": "Wiadomości i — tylko gdy zaznaczysz — zredagowany skrót ustaleń trafią do wybranego dostawcy. Bez plików, ścieżek i sekretów.", "ex.attach": "Dołącz skrót najnowszych raportów do następnej wiadomości", "ex.chat": "Rozmowa z ekspertem", "ex.clear": "Wyczyść", "ex.empty": "Zadaj pytanie albo wybierz podpowiedź.", "ex.ph": "Np. Co naprawić najpierw przed publikacją? (Enter — wyślij, Shift+Enter — nowa linia)", "ex.send": "Wyślij",
    "ex.s1": "Wyjaśnij moje raporty i ułóż plan naprawy", "ex.s2": "Jak bezpiecznie trzymać klucze API w projekcie?", "ex.s3": "Jakie nagłówki bezpieczeństwa powinna mieć moja strona?", "ex.s4": "Co zrobić w pierwszych 5 minutach po wycieku klucza?",
    "ex.needConsent": "Włącz zgodę na wysyłanie, aby rozmawiać z modelem.", "ex.copy": "kopiuj", "ex.judgment": "ocena modelu", "ex.focus": "Wyjaśnij to ustalenie prostym językiem i podaj bezpieczną poprawkę z krokiem cofnięcia oraz retestem.",
    "ag.eyebrow": "SKILL W AGENCIE", "ag.title": "Przekaż zadanie agentowi CLI", "ag.lead": "Agent czyta skill cyber-defense i prowadzi audyt sam, pytając o zgody. Uruchom w tle albo skopiuj komendę do własnego terminala.", "ag.mission": "Zadanie", "ag.target": "Cel (ścieżka / URL)", "ag.launch": "⚡ Uruchom w tle", "ag.copyCli": "Kopiuj komendę", "ag.copyPrompt": "Kopiuj prompt", "ag.sessions": "Sesje agentów", "ag.noSessions": "Brak sesji.", "ag.stop": "Zatrzymaj",
    "ag.m.demo": "Demo end-to-end", "ag.m.code": "Audyt kodu i zależności", "ag.m.pc": "Audyt komputera", "ag.m.web": "Pasywny audyt strony", "ag.m.report": "Raport HTML/PDF",
    "rp.title": "Pliki w .cda/reports", "rp.empty": "Brak plików. Uruchom demo.",
    "sys.doctor": "Diagnostyka (bez sieci)", "sys.rerun": "Sprawdź ponownie", "sys.bounds": "Granice bezpieczeństwa", "sys.keys": "Skróty klawiszowe",
    "sys.b1": "Panel słucha tylko na 127.0.0.1, sprawdza Host/Origin i wymaga tokenu sesji dla każdej akcji.", "sys.b2": "Każdy krok, który czyta pliki, komputer lub sieć, wymaga Twojej zgody.", "sys.b3": "Model nie ma narzędzi, plików ani powłoki. Dostaje tylko zredagowany skrót.", "sys.b4": "Odpowiedź modelu to ocena modelu — tylko retest zamyka ustalenie.", "sys.b5": "Nic nie jest instalowane ani zmieniane w sprawdzanym projekcie.",
    "sys.k1": "przełącz widok", "sys.k2": "szukaj w ustaleniach", "sys.k3": "odśwież dane", "sys.k4": "zmień język",
    "t.provider": "Zmieniono dostawcę: zgoda wyłączona, rozmowa wyczyszczona.", "t.copied": "Skopiowano do schowka", "t.saved": "Zapisano wybór modelu", "t.started": "Uruchomiono audyt", "t.done": "Audyt zakończony", "t.failed": "Krok audytu zakończył się błędem", "t.consent": "Najpierw zaznacz zgodę", "t.launched": "Agent uruchomiony", "t.exported": "Zapisano plik Markdown", "t.url": "Podaj adres zaczynający się od https://",
    "model.none": "model: brak", "updated": "aktualizacja", "never": "brak danych",
    "st.running": "trwa", "st.completed": "gotowe", "st.failed": "błąd", "st.cancelled": "anulowano", "st.pending": "czeka", "st.not_installed": "brak CLI", "st.auth_error": "logowanie",
  },
  en: {
    skip: "Skip to content", guard: "127.0.0.1 · read-only · session token", refresh: "Refresh (R)",
    "nav.overview": "Overview", "nav.audit": "Audit", "nav.findings": "Findings", "nav.expert": "AI expert", "nav.agents": "CLI agents", "nav.reports": "Reports", "nav.system": "System",
    "score.label": "score", "score.note": "A reading aid from open findings (P0 −30, P1 −12, P2 −4, P3 −1). Not a security certification.",
    "hero.eyebrow": "PROTECTION STATUS", "act.demo": "▶ Run demo", "act.audit": "New audit", "act.explain": "🧠 Explain with AI", "act.dashboard": "Dashboard ↗",
    "kpi.P0": "act today", "kpi.P1": "this week", "kpi.P2": "plan it", "kpi.P3": "when convenient", "kpi.fixed": "confirmed fixes", "kpi.sources": "evidence sources",
    "ov.top": "Top findings", "ov.all": "All →", "ov.areas": "Areas", "ov.coverage": "Coverage",
    "ov.empty": "No reports yet. Run the demo or a first audit.", "ov.noAreas": "No open findings by area.",
    "cov.sources": "Sources", "cov.packages": "Packages inventoried", "cov.checked": "Checked in vulnerability databases", "cov.notChecked": "Needs manual check", "cov.files": "Files in scope", "cov.incomplete": "Incomplete sources", "cov.updated": "Last change",
    "verdict.act": "Act today", "verdict.attention": "Needs attention this week", "verdict.routine": "Routine maintenance", "verdict.clear": "No findings in the checked scope", "verdict.incomplete": "Incomplete coverage", "verdict.none": "Nothing checked yet",
    "verdictText.act": "There are P0 findings. Start there — exact fixes are below.", "verdictText.attention": "No P0, but urgent P1 items. Plan fixes this week.", "verdictText.routine": "Only routine P2/P3 items. A good moment to tidy up.", "verdictText.clear": "The tools found nothing in the checked scope. That is not proof of complete security.", "verdictText.incomplete": "Some checks did not complete — rerun them before trusting the result.", "verdictText.none": "Start with the safe synthetic demo or choose an audit target.",
    "audit.eyebrow": "GUIDED AUDIT", "audit.title": "What do you want to check today?", "audit.target": "Project path or URL", "audit.consent.t": "Consent for this step", "audit.start": "▶ Start audit", "audit.cancel": "⏹ Cancel", "audit.resume": "↻ Resume", "audit.active": "Current run", "audit.history": "History", "audit.noRun": "No runs yet. Pick a target and start.",
    "wf.pc": "Computer", "wf.pc.d": "Software, ports, known CVEs", "wf.project": "Project", "wf.project.d": "Code, secrets, dependencies", "wf.web": "Website", "wf.web.d": "HTTPS, headers, cookies, TLS", "wf.demo": "Demo", "wf.demo.d": "Synthetic data, no risk",
    "consent.pc": "I consent to reading the list of installed software and open ports locally.", "consent.project": "I consent to preparing a scope for the files listed.", "consent.web": "I own this site or have the owner's permission; run a few passive GET requests (--authorized).", "consent.demo": "The demo uses synthetic data — no consent needed.",
    "audit.files": "Relative paths, one per line", "audit.approve": "Approve step", "audit.scope": "Approve reading the files listed below.", "audit.share": "Send package names and versions to OSV.dev and download the CISA KEV list.", "t.files": "Enter the exact file paths.",
    "st.awaiting_approval": "awaiting approval",
    "audit.progress": "Audit progress", "audit.filter": "Filter history by status", "audit.all": "All statuses", "audit.noMatches": "No runs with this status.", "t.target": "Enter the project directory.",
    "ag.m.changes": "Review changes", "ag.m.retest": "Plan a retest", "ag.m.ocr": "Plan OpenCodeReview use", "ag.preview": "Prompt preview",
    "rp.search": "Search reports", "rp.format": "Report format", "rp.allFormats": "All formats", "rp.noMatches": "No reports match these filters.", "t.network": "Could not connect to the local panel.",
    "target.project": "Project path", "target.web": "Website address (https://…)",
    "f.search": "Search findings… ( / )", "f.all": "All", "f.ideas": "Ideas", "f.allAreas": "All areas", "f.export": "⇩ Export Markdown", "f.area": "Area",
    "f.summary": "Showing {n} of {t} findings", "f.none": "No findings for these filters.", "f.impact": "Impact", "f.evidence": "Evidence", "f.fix": "Fix", "f.verify": "Verify", "f.source": "Source", "f.ask": "🧠 Ask the expert", "f.copy": "Copy fix", "f.model": "model judgment", "f.reopened": "reopened",
    "ex.eyebrow": "YOUR MODEL", "ex.title": "Connect a model", "ex.lead": "A subscription (Claude Code, Codex), an API key (OpenRouter, Anthropic, OpenAI) or local Ollama. The model gets no tools or files.", "ex.model": "Model (optional)", "ex.model.ph": "provider default", "ex.save": "💾 Remember choice", "ex.consent.t": "Consent to send", "ex.consent": "Messages and — only when you tick it — a redacted brief of findings go to the chosen provider. No files, paths or secrets.", "ex.attach": "Attach a brief of the newest reports to the next message", "ex.chat": "Conversation with the expert", "ex.clear": "Clear", "ex.empty": "Ask a question or pick a suggestion.", "ex.ph": "e.g. What should I fix first before release? (Enter — send, Shift+Enter — new line)", "ex.send": "Send",
    "ex.s1": "Explain my reports and build a fix plan", "ex.s2": "How do I keep API keys safe in a project?", "ex.s3": "Which security headers should my site have?", "ex.s4": "What to do in the first 5 minutes after a key leak?",
    "ex.needConsent": "Turn on consent to talk to the model.", "ex.copy": "copy", "ex.judgment": "model judgment", "ex.focus": "Explain this finding in plain language and give a safe fix with a rollback step and a retest.",
    "ag.eyebrow": "SKILL IN AN AGENT", "ag.title": "Hand a task to a CLI agent", "ag.lead": "The agent reads the cyber-defense skill and runs the audit itself, asking for consent. Launch in the background or copy the command to your own terminal.", "ag.mission": "Task", "ag.target": "Target (path / URL)", "ag.launch": "⚡ Launch in background", "ag.copyCli": "Copy command", "ag.copyPrompt": "Copy prompt", "ag.sessions": "Agent sessions", "ag.noSessions": "No sessions.", "ag.stop": "Stop",
    "ag.m.demo": "End-to-end demo", "ag.m.code": "Code & dependency audit", "ag.m.pc": "Computer audit", "ag.m.web": "Passive website audit", "ag.m.report": "HTML/PDF report",
    "rp.title": "Files in .cda/reports", "rp.empty": "No files. Run the demo.",
    "sys.doctor": "Diagnostics (no network)", "sys.rerun": "Check again", "sys.bounds": "Safety boundaries", "sys.keys": "Keyboard shortcuts",
    "sys.b1": "The panel listens on 127.0.0.1 only, checks Host/Origin and needs a session token for every action.", "sys.b2": "Every step that reads files, the machine or the network needs your consent.", "sys.b3": "The model has no tools, files or shell. It receives a redacted brief only.", "sys.b4": "A model answer is model judgment — only a retest closes a finding.", "sys.b5": "Nothing is installed or changed in the audited project.",
    "sys.k1": "switch view", "sys.k2": "search findings", "sys.k3": "refresh data", "sys.k4": "switch language",
    "t.provider": "Provider changed: consent turned off, conversation cleared.", "t.copied": "Copied to clipboard", "t.saved": "Model choice saved", "t.started": "Audit started", "t.done": "Audit finished", "t.failed": "An audit step failed", "t.consent": "Tick consent first", "t.launched": "Agent launched", "t.exported": "Markdown file saved", "t.url": "Enter an address starting with https://",
    "model.none": "model: none", "updated": "updated", "never": "no data",
    "st.running": "running", "st.completed": "done", "st.failed": "failed", "st.cancelled": "cancelled", "st.pending": "pending", "st.not_installed": "no CLI", "st.auth_error": "login",
  },
};

const VIEWS = ["overview", "audit", "findings", "expert", "agents", "reports", "system"];
const requestedLang = new URLSearchParams(location.search).get("lang");
const state = {
  lang: (() => {
    if (requestedLang === "pl" || requestedLang === "en") return requestedLang;
    try {
      const saved = localStorage.getItem("cda.lang");
      if (saved === "pl" || saved === "en") return saved;
    } catch { /* private mode */ }
    return document.querySelector('meta[name="cda-lang"]').content;
  })(),
  view: "overview", overview: null, status: null, providers: null, config: null,
  provider: null, wf: "demo", runId: null, host: "claude", bridge: null,
  filter: { p: "all", area: "all", q: "" }, open: new Set(), chat: [], chatEpoch: 0, busy: false, lastRunStatus: {},
};
const t = (key, vars = {}) => (I18N[state.lang][key] ?? I18N.pl[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

/* ---------- API ---------- */
async function api(path, body) {
  const init = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json", "x-cda-token": TOKEN }, body: JSON.stringify(body) };
  let res;
  try {
    res = await fetch(path, init);
  } catch {
    return { ok: false, error: t("t.network") };
  }
  const data = await res.json().catch(() => ({ ok: false, error: `HTTP_${res.status}` }));
  if (!res.ok && data.ok !== false) data.ok = false;
  return data;
}

/* ---------- UI helpers ---------- */
function toast(text, kind = "") {
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = text;
  $("#toasts").append(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 320); }, 3200);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast(t("t.copied"), "ok"); } catch { toast(text); }
}
const timeAgo = (iso) => {
  if (!iso) return t("never");
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  const rtf = new Intl.RelativeTimeFormat(state.lang, { numeric: "auto" });
  if (s < 60) return rtf.format(-Math.round(s), "second");
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
};
const size = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

/** Minimal, safe Markdown: escape first, then headings, lists, bold, inline code and fences. */
function md(text) {
  const blocks = String(text).split(/```/);
  return blocks.map((block, i) => {
    if (i % 2) return `<pre><code>${esc(block.replace(/^[\w-]*\n/, ""))}</code></pre>`;
    const lines = esc(block).split("\n");
    let html = "", list = null;
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of lines) {
      const line = raw.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[\s(])\*(?!\s)([^*]+?)\*(?=[\s.,:;!?)]|$)/g, "$1<em>$2</em>").replace(/`([^`]+)`/g, "<code>$1</code>");
      let m;
      if ((m = line.match(/^#{1,4}\s+(.*)/))) { close(); html += `<h4>${m[1]}</h4>`; }
      else if ((m = line.match(/^\s*[-*]\s+(.*)/))) { if (list !== "ul") { close(); html += "<ul>"; list = "ul"; } html += `<li>${m[1]}</li>`; }
      else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== "ol") { close(); html += "<ol>"; list = "ol"; } html += `<li>${m[1]}</li>`; }
      else if (!line.trim()) close();
      else { close(); html += `<p>${line}</p>`; }
    }
    close();
    return html;
  }).join("");
}

/* ---------- i18n ---------- */
function applyLang() {
  document.documentElement.lang = state.lang;
  $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  $$("[data-i18n-title]").forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  $$("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  $$("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang)));
  try { localStorage.setItem("cda.lang", state.lang); } catch { /* private mode */ }
  setView(state.view, false);
  renderAll();
}

/* ---------- navigation ---------- */
function setView(view, focus = true) {
  if (!VIEWS.includes(view)) return;
  state.view = view;
  $$("[data-view]").forEach((s) => { s.hidden = s.dataset.view !== view; });
  $$("[data-nav]").forEach((b) => (b.dataset.nav === view ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
  $("#view-title").textContent = t(`nav.${view}`);
  $("#view-eyebrow").textContent = `0${VIEWS.indexOf(view) + 1} / ${t(`nav.${view}`).toUpperCase()}`;
  if (history.replaceState) history.replaceState(null, "", `#${view}`);
  if (view === "system") loadDoctor();
  if (focus) $("#main").focus({ preventScroll: true });
}

/* ---------- data ---------- */
async function refresh({ spin = false } = {}) {
  if (spin) $("#refresh-btn").classList.add("spin");
  const [overview, status, providers] = await Promise.all([api("/api/overview"), api("/api/status"), api("/api/providers")]);
  if (overview.ok === false || status.ok === false || providers.ok === false) {
    if (spin) toast(overview.error ?? status.error ?? providers.error, "err");
    $("#refresh-btn").classList.remove("spin");
    return;
  }
  state.overview = overview;
  state.status = status;
  state.providers = providers.providers ?? [];
  state.config = providers.config ?? {};
  if (!state.provider) state.provider = state.config.provider || state.providers.find((p) => p.ready)?.id || "claude-code";
  for (const run of status.runs ?? []) {
    const prev = state.lastRunStatus[run.runId];
    if (prev === "running" && ["completed", "failed"].includes(run.status)) toast(run.status === "completed" ? `${t("t.done")}: ${run.title}` : `${t("t.failed")}: ${run.title}`, run.status === "completed" ? "ok" : "err");
    state.lastRunStatus[run.runId] = run.status;
  }
  renderAll();
  $("#refresh-btn").classList.remove("spin");
}

function renderAll() {
  if (!state.overview) return;
  renderTopbar(); renderOverview(); renderAudit(); renderFindings(); renderExpert(); renderAgents(); renderReports();
}

function renderTopbar() {
  const p = state.providers?.find((x) => x.id === state.config?.provider);
  const chip = $("#chip-model");
  chip.textContent = p ? `🧠 ${p.id}${state.config.model ? ` · ${state.config.model}` : ""}` : t("model.none");
  chip.className = `chip ${p?.ready ? "ok" : ""}`;
  $("#chip-updated").textContent = `${t("updated")}: ${timeAgo(state.overview.lastUpdate)}`;
  const urgent = (state.overview.counts?.P0 ?? 0) + (state.overview.counts?.P1 ?? 0);
  const badge = $("#nav-findings-count");
  badge.hidden = !urgent;
  badge.textContent = urgent;
}

function renderOverview() {
  const o = state.overview;
  const verdict = o.sources ? o.verdict : "none";
  const color = { act: "var(--p0)", attention: "var(--p1)", routine: "var(--p2)", clear: "var(--ok)", incomplete: "var(--p1)", none: "var(--muted)" }[verdict];
  $("#score").style.setProperty("--score-color", color);
  $("#score-value").textContent = o.score ?? "—";
  $("#score-ring").style.strokeDashoffset = String(326.7 * (1 - (o.score ?? 0) / 100));
  $("#verdict-title").textContent = t(`verdict.${verdict}`);
  $("#verdict-title").style.color = color;
  $("#verdict-text").textContent = t(`verdictText.${verdict}`);
  for (const p of ["P0", "P1", "P2", "P3"]) $(`#k-${p}`).textContent = o.counts?.[p] ?? 0;
  $("#k-fixed").textContent = o.confirmedFixes ?? 0;
  $("#k-sources").textContent = o.sources ?? 0;
  const top = (o.findings ?? []).filter((f) => f.priority !== "IDEA").slice(0, 6);
  $("#top-findings").innerHTML = top.length
    ? top.map((f) => `<li><button type="button" data-open-finding="${esc(f.id)}"><span class="prio ${esc(f.priority)}">${esc(f.priority)}</span><span class="t">${esc(f.title)}</span><span class="tag">${esc(f.area)}</span></button></li>`).join("")
    : `<li class="empty"><b>🛡️</b>${esc(t("ov.empty"))}</li>`;
  const max = Math.max(1, ...(o.areas ?? []).map(([, n]) => n));
  $("#area-bars").innerHTML = (o.areas ?? []).length
    ? o.areas.map(([a, n]) => `<li><span>${esc(a)}</span><div class="track"><div class="fill" data-w="${(n / max) * 100}"></div></div><b>${n}</b></li>`).join("")
    : `<li class="muted small">${esc(t("ov.noAreas"))}</li>`;
  requestAnimationFrame(() => $$("#area-bars .fill").forEach((el) => { el.style.width = `${el.dataset.w}%`; }));
  const s = o.stats ?? {};
  const facts = [["cov.sources", o.sources], ["cov.files", s.files], ["cov.packages", s.packages], ["cov.checked", s.checked], ["cov.notChecked", s.notChecked], ["cov.incomplete", (o.incomplete ?? []).length], ["cov.updated", timeAgo(o.lastUpdate)]];
  $("#coverage").innerHTML = facts.map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${esc(v ?? 0)}</dd>`).join("");
}

/* ---------- audit ---------- */
function renderAudit() {
  $$("[data-wf]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.wf === state.wf)));
  const needsTarget = state.wf === "project" || state.wf === "web";
  $("#wf-target-field").hidden = !needsTarget;
  $("#wf-files-field").hidden = state.wf !== "project";
  if (needsTarget) $("#wf-target-label").textContent = t(`target.${state.wf}`);
  $("#wf-target").placeholder = state.wf === "web" ? "https://example.com" : "./";
  $("#wf-consent-box").hidden = state.wf === "demo";
  $("#wf-share-box").hidden = state.wf !== "pc";
  $("#wf-consent-text").textContent = t(`consent.${state.wf}`);
  const runs = state.status?.runs ?? [];
  const run = runs.find((r) => r.runId === state.runId) ?? runs[0];
  if (run) state.runId = run.runId;
  $("#wf-cancel").hidden = !["running", "awaiting_approval"].includes(run?.status);
  $("#wf-resume").hidden = !(run && ["failed", "cancelled"].includes(run.status));
  const st = $("#run-status");
  st.textContent = run ? t(`st.${run.status}`) : "—";
  st.className = `chip ${run?.status === "completed" ? "ok" : run?.status === "running" ? "run" : run ? "err" : ""}`;
  const progress = $("#run-progress");
  progress.hidden = !run;
  progress.max = Math.max(1, run?.steps.length ?? 0);
  progress.value = run?.steps.filter((step) => step.status === "completed").length ?? 0;
  $("#run-steps").innerHTML = run
    ? run.steps.map((s, i) => `<li><span class="step-dot ${esc(s.status)}">${s.status === "completed" ? "✓" : s.status === "failed" ? "!" : i + 1}</span><div>${esc(s.label.replace(/^\d+\.\s*/, ""))}<small>${esc(t(`st.${s.status}`))}${s.error ? ` · ${esc(s.error.slice(0, 160))}` : ""}</small></div></li>`).join("")
    : `<li class="empty">${esc(t("audit.noRun"))}</li>`;
  $("#run-next").hidden = !run?.nextStep;
  $("#run-next").textContent = run?.nextStep ?? "";
  const approval = run?.status === "awaiting_approval" ? run.pendingApproval : null;
  $("#run-approval").hidden = !approval;
  $("#run-approval-label").textContent = approval ? t(approval.kind === "scope" ? "audit.scope" : "audit.share") : "";
  $("#run-scope").hidden = approval?.kind !== "scope";
  $("#run-scope").textContent = approval?.kind === "scope" ? [approval.root, ...approval.files].join("\n") : "";
  $("#run-reports").innerHTML = (run?.reports ?? []).map((r) => `<a class="chip run" href="/report/${encodeURIComponent(r)}" target="_blank" rel="noopener">📄 ${esc(r)}</a>`).join("");
  const status = $("#run-filter").value;
  const history = runs.filter((item) => status === "all" || item.status === status);
  $("#run-history").innerHTML = history.length
    ? history.map((r) => `<li><button type="button" class="btn history-item" data-run="${esc(r.runId)}" aria-pressed="${r.runId === state.runId}"><span><strong>${esc(r.title)}</strong><small>${esc(timeAgo(r.createdAt))} · ${esc(r.runId)}</small></span><span class="chip ${r.status === "completed" ? "ok" : r.status === "running" ? "run" : "err"}">${esc(t(`st.${r.status}`))}</span></button></li>`).join("")
    : `<li class="empty">${esc(t(runs.length ? "audit.noMatches" : "audit.noRun"))}</li>`;
}

async function startAudit(workflow = state.wf) {
  const consent = workflow === "demo" ? true : $("#wf-consent").checked;
  if (!consent) { toast(t("t.consent"), "err"); return; }
  const target = $("#wf-target").value.trim();
  if (workflow === "web" && !/^https?:\/\//i.test(target)) { toast(t("t.url"), "err"); return; }
  const files = workflow === "project" ? $("#wf-files").value.split(/\r?\n/).map((file) => file.trim()).filter(Boolean) : [];
  if (workflow === "project" && !target) { toast(t("t.target"), "err"); return; }
  if (workflow === "project" && !files.length) { toast(t("t.files"), "err"); return; }
  const sharePackageNames = workflow === "pc" && $("#wf-share").checked;
  const data = await api("/api/workflows/start", { workflow, consent, target: target || undefined, files, sharePackageNames, lang: state.lang });
  if (!data.ok) { toast(`❌ ${data.error}`, "err"); return; }
  state.runId = data.run.runId;
  state.lastRunStatus[data.run.runId] = "running";
  toast(`${t("t.started")}: ${data.run.title}`, "ok");
  setView("audit");
  refresh();
}

/* ---------- findings ---------- */
function filteredFindings() {
  const { p, area, q } = state.filter;
  const needle = q.trim().toLowerCase();
  return (state.overview?.findings ?? []).filter((f) =>
    (p === "all" || f.priority === p) && (area === "all" || f.area === area) &&
    (!needle || `${f.title} ${f.fix} ${f.impact} ${f.evidence} ${f.area}`.toLowerCase().includes(needle)));
}
function renderFindings() {
  const all = state.overview?.findings ?? [];
  const areas = [...new Set(all.map((f) => f.area))].sort();
  const sel = $("#f-area");
  const current = state.filter.area;
  sel.innerHTML = `<option value="all">${esc(t("f.allAreas"))}</option>${areas.map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join("")}`;
  sel.value = areas.includes(current) ? current : "all";
  $$("#f-priority button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.p === state.filter.p)));
  const list = filteredFindings();
  $("#f-summary").textContent = t("f.summary", { n: list.length, t: state.overview?.total ?? all.length });
  $("#findings-list").innerHTML = list.length ? list.map((f) => `
    <article class="finding ${state.open.has(f.id) ? "open" : ""}" data-id="${esc(f.id)}">
      <button type="button" aria-expanded="${state.open.has(f.id)}" data-toggle="${esc(f.id)}">
        <span class="prio ${esc(f.priority)}">${esc(f.priority)}</span>
        <span class="ft">${esc(f.title)}<small>${esc(f.area)} · ${esc(f.source)}</small></span>
        ${f.basis === "model" ? `<span class="tag model">${esc(t("f.model"))}</span>` : ""}
        ${f.status === "reopened" ? `<span class="tag reopened">${esc(t("f.reopened"))}</span>` : ""}
        <svg class="chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="body"><dl>
        ${f.impact ? `<dt>${esc(t("f.impact"))}</dt><dd>${esc(f.impact)}</dd>` : ""}
        ${f.evidence ? `<dt>${esc(t("f.evidence"))}</dt><dd class="mono">${esc(f.evidence)}</dd>` : ""}
        ${f.fix ? `<dt>${esc(t("f.fix"))}</dt><dd>${esc(f.fix)}</dd>` : ""}
        ${f.verify ? `<dt>${esc(t("f.verify"))}</dt><dd>${esc(f.verify)}</dd>` : ""}
      </dl>
      <div class="btn-row"><button type="button" class="btn btn-primary" data-ask="${esc(f.id)}">${esc(t("f.ask"))}</button><button type="button" class="btn" data-copy-fix="${esc(f.id)}">${esc(t("f.copy"))}</button></div></div>
    </article>`).join("") : `<div class="empty"><b>🔍</b>${esc(all.length ? t("f.none") : t("ov.empty"))}</div>`;
}
function exportFindings() {
  const list = filteredFindings();
  const lines = [`# Cyber Defense Agent — ${t("nav.findings")}`, "", `${t("f.summary", { n: list.length, t: state.overview?.total ?? list.length })} · ${new Date().toISOString()}`, ""];
  for (const f of list) lines.push(`## [${f.priority}] ${f.title}`, "", `- ${t("f.area")}: ${f.area}`, f.impact && `- ${t("f.impact")}: ${f.impact}`, f.fix && `- ${t("f.fix")}: ${f.fix}`, f.verify && `- ${t("f.verify")}: ${f.verify}`, "");
  const blob = new Blob([lines.filter((l) => typeof l === "string").join("\n")], { type: "text/markdown" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `cda-findings-${Date.now()}.md` });
  a.click();
  URL.revokeObjectURL(a.href);
  toast(t("t.exported"), "ok");
}

/* ---------- expert ---------- */
const ICON = { "claude-code": "✳️", codex: "◎", openrouter: "⇄", anthropic: "A", openai: "◐", ollama: "🦙" };
function renderExpert() {
  $("#providers").innerHTML = (state.providers ?? []).map((p) => `
    <button type="button" class="provider" role="radio" aria-checked="${p.id === state.provider}" data-provider="${esc(p.id)}">
      <span class="pi">${esc(ICON[p.id] ?? "•")}</span>
      <span><strong>${esc(p.id)}</strong><small>${esc(state.lang === "en" ? p.label : p.labelPl)}</small></span>
      <span class="st ${p.ready ? "ready" : "setup"}" title="${esc(p.ready ? "" : p.setup)}">${p.ready ? "READY" : p.local ? "LOCAL" : "SETUP"}</span>
    </button>`).join("");
  if (state.config?.model && !$("#ex-model").dataset.touched) $("#ex-model").value = state.config.provider === state.provider ? state.config.model : "";
  const p = state.providers?.find((x) => x.id === state.provider);
  $("#ex-target").textContent = p ? `${p.id} · ${$("#ex-model").value.trim() || p.defaultModel || "CLI default"}${p.ready ? "" : ` · ${p.setup}`}` : "—";
  const sug = ["ex.s1", "ex.s2", "ex.s3", "ex.s4"];
  $("#suggest").innerHTML = sug.map((k) => `<button type="button" data-suggest="${k}">${esc(t(k))}</button>`).join("");
}
function renderChat() {
  const log = $("#chat-log");
  $("#chat-empty").hidden = state.chat.length > 0;
  $$(".msg, .typing", log).forEach((el) => el.remove());
  for (const [i, m] of state.chat.entries()) {
    const el = document.createElement("div");
    el.className = `msg ${m.role}${m.error ? " error" : ""}`;
    if (m.role === "assistant" && !m.error) {
      el.innerHTML = `${md(m.content)}<div class="meta"><span>${esc(m.meta ?? "")} · ${esc(t("ex.judgment"))}</span><button type="button" data-copy-msg="${i}">${esc(t("ex.copy"))}</button></div>`;
    } else el.textContent = m.display ?? m.content;
    log.append(el);
  }
  if (state.busy) { const ty = document.createElement("div"); ty.className = "typing"; ty.innerHTML = "<i></i><i></i><i></i>"; log.append(ty); }
  log.scrollTop = log.scrollHeight;
}
/** Newest complete turns within the server's character budget, starting on a user turn. */
function boundedHistory(messages, budget = 45000) {
  const kept = [];
  let used = 0;
  for (let i = messages.length - 1; i >= 0 && kept.length < 20; i -= 1) {
    const len = messages[i].content.length;
    if (used + len > budget && kept.length) break;
    kept.unshift(messages[i]);
    used += len;
  }
  while (kept.length > 1 && kept[0].role !== "user") kept.shift();
  return kept;
}
/** Returns true only when the message was accepted for sending, so callers keep the draft otherwise. */
async function send(text, { focus = null, attach = false } = {}) {
  if (state.busy || !text.trim()) return false;
  if (!$("#ex-consent").checked) { setView("expert"); toast(t("ex.needConsent"), "err"); $("#ex-consent").focus(); return false; }
  void deliver(text, { focus, attach });
  return true;
}
async function deliver(text, { focus, attach }) {
  const attachReports = attach || $("#ex-attach").checked;
  state.chat.push({ role: "user", content: text, display: focus ? `${text}\n\n▸ [${focus.priority}] ${focus.title}` : attachReports ? `${text}\n\n▸ +reports` : text });
  state.busy = true; renderChat(); $("#chat-send").disabled = true;
  const epoch = state.chatEpoch;
  const history = boundedHistory(state.chat.filter((m) => !m.error).map(({ role, content }) => ({ role, content })));
  let data;
  try {
    data = await api("/api/model/chat", { provider: state.provider, model: $("#ex-model").value.trim(), messages: history, consent: true, lang: state.lang, focus, attachReports });
  } catch (error) {
    data = { ok: false, error: "NETWORK_ERROR", detail: String(error?.message ?? "").slice(0, 120) };
  }
  // The conversation was cleared or the provider changed while this request was pending: drop the reply.
  if (epoch !== state.chatEpoch) return;
  state.busy = false; $("#chat-send").disabled = false; $("#ex-attach").checked = false;
  if (data.ok) {
    if (data.sentContent) state.chat.at(-1).content = data.sentContent;
    state.chat.push({ role: "assistant", content: data.text, meta: `${data.provider} · ${data.model} · ${data.seconds}s` });
  }
  else { state.chat.pop(); state.chat.push({ role: "assistant", error: true, content: `❌ ${data.error}${data.detail ? ` — ${data.detail}` : ""}` }); }
  renderChat();
}

/* ---------- agents ---------- */
let bridgeRequest = 0;
async function refreshBridge() {
  const q = new URLSearchParams({ host: state.host, mission: $("#ag-mission").value, target: $("#ag-target").value, lang: state.lang });
  const request = ++bridgeRequest;
  const bridge = await api(`/api/bridge?${q}`);
  if (request !== bridgeRequest) return;
  state.bridge = bridge.ok === false ? null : bridge;
  $("#ag-command").textContent = state.bridge?.cliCommand ?? bridge.error ?? "";
  $("#ag-prompt").textContent = state.bridge?.prompt ?? "";
}
function renderAgents() {
  const agents = state.status?.agents ?? {};
  $("#hosts").innerHTML = Object.entries(agents).map(([id, a]) => `
    <button type="button" class="host" role="radio" aria-checked="${id === state.host}" data-host="${esc(id)}">
      <strong>${esc(a.name)}</strong><small class="${a.installed ? "" : "muted"}">${esc(a.installed ? `✓ ${a.version}` : `○ ${t("st.not_installed")}`)}</small><small>${esc(a.entry)}</small>
    </button>`).join("");
  const sessions = state.status?.sessions ?? [];
  $("#sessions").innerHTML = sessions.length
    ? sessions.slice(0, 8).map((s) => `<li><div><strong>${esc(s.hostName)} · ${esc(s.title)}</strong><small>${esc(timeAgo(s.startedAt))}${s.authHint ? ` · ⚠️ ${esc(s.authHint)}` : s.error ? ` · ${esc(s.error.slice(0, 120))}` : ""}</small></div><span class="chip ${s.status === "completed" ? "ok" : s.status === "running" ? "run" : "err"}">${esc(t(`st.${s.status}`) )}</span>${s.status === "running" ? `<button type="button" class="btn btn-danger" data-stop="${esc(s.sessionId)}">${esc(t("ag.stop"))}</button>` : ""}</li>`).join("")
    : `<li class="empty">${esc(t("ag.noSessions"))}</li>`;
}

/* ---------- reports & system ---------- */
function renderReports() {
  const all = state.status?.reports ?? [];
  const query = $("#rp-search").value.trim().toLowerCase();
  const format = $("#rp-format").value;
  const reports = all.filter((report) => (format === "all" || report.ext.toLowerCase() === format) && report.name.toLowerCase().includes(query));
  $("#report-grid").innerHTML = reports.length
    ? reports.map((r) => `<a class="report" href="/report/${encodeURIComponent(r.name)}" target="_blank" rel="noopener"><span class="ext ${esc(r.ext)}">${esc(r.ext)}</span><strong>${esc(r.name)}</strong><small>${esc(size(r.size))} · ${esc(timeAgo(r.updatedAt))}</small></a>`).join("")
    : `<div class="empty"><b>📄</b>${esc(t(all.length ? "rp.noMatches" : "rp.empty"))}</div>`;
}
async function loadDoctor() {
  const d = await api("/api/doctor");
  const icon = { ok: "✓", warn: "!", fail: "✗" };
  $("#doctor").innerHTML = (d.checks ?? []).map((c) => `<li><span class="ic ${esc(c.status)}">${icon[c.status] ?? "•"}</span><code>${esc(c.id)}</code><div>${esc(c.detail)}${c.status !== "ok" && c.fix ? `<small>→ ${esc(c.fix)}</small>` : ""}</div></li>`).join("");
}

/* ---------- events ---------- */
document.addEventListener("click", async (e) => {
  const el = e.target.closest("button, [data-run]");
  if (!el) return;
  const d = el.dataset;
  if (d.nav) setView(d.nav);
  else if (d.navTo) setView(d.navTo);
  else if (d.lang) { state.lang = d.lang; applyLang(); }
  else if (d.filterPriority) { state.filter = { p: d.filterPriority, area: "all", q: "" }; $("#f-search").value = ""; renderFindings(); setView("findings"); }
  else if (d.openFinding) { state.filter = { p: "all", area: "all", q: "" }; $("#f-search").value = ""; state.open.add(d.openFinding); renderFindings(); setView("findings"); $(`[data-id="${CSS.escape(d.openFinding)}"]`)?.scrollIntoView({ block: "center" }); }
  else if (d.toggle) { state.open.has(d.toggle) ? state.open.delete(d.toggle) : state.open.add(d.toggle); renderFindings(); $(`[data-toggle="${CSS.escape(d.toggle)}"]`)?.focus(); }
  else if (d.p) { state.filter.p = d.p; renderFindings(); }
  else if (d.ask) { const f = state.overview.findings.find((x) => x.id === d.ask); setView("expert"); send(t("ex.focus"), { focus: { priority: f.priority, area: f.area, title: f.title, fix: f.fix } }); }
  else if (d.copyFix) copy(state.overview.findings.find((x) => x.id === d.copyFix)?.fix ?? "");
  else if (d.copyMsg) copy(state.chat[Number(d.copyMsg)]?.content ?? "");
  else if (d.wf) { state.wf = d.wf; $("#wf-consent").checked = false; $("#wf-share").checked = false; renderAudit(); }
  else if (d.run) { state.runId = d.run; renderAudit(); }
  else if (d.provider) {
    if (state.provider !== d.provider) {
      // A new destination needs its own consent; earlier messages were approved only for the old one.
      $("#ex-model").value = ""; $("#ex-model").dataset.touched = "1";
      const hadSomething = state.chat.length || $("#ex-consent").checked;
      $("#ex-consent").checked = false; resetChat();
      if (hadSomething) toast(t("t.provider"));
    }
    state.provider = d.provider; renderExpert();
  }
  else if (d.suggest) { if (d.suggest === "ex.s1") send(t(d.suggest), { attach: true }); else send(t(d.suggest)); }
  else if (d.host) { state.host = d.host; renderAgents(); refreshBridge(); }
  else if (d.copy) copy(d.copy === "cli" ? state.bridge?.cliCommand : state.bridge?.prompt);
  else if (d.stop) { await api("/api/agent-sessions/stop", { sessionId: d.stop }); refresh(); }
  else if (d.action === "run-demo") startAudit("demo");
  else if (d.action === "explain-all") { setView("expert"); send(t("ex.s1"), { attach: true }); }
});
$("#wf-target").addEventListener("input", () => { $("#wf-consent").checked = false; });
$("#wf-files").addEventListener("input", () => { $("#wf-consent").checked = false; });
$("#run-filter").addEventListener("change", renderAudit);
$("#rp-search").addEventListener("input", renderReports);
$("#rp-format").addEventListener("change", renderReports);
$("#wf-start").addEventListener("click", () => startAudit());
$("#wf-cancel").addEventListener("click", async () => { await api("/api/workflows/cancel", { runId: state.runId }); refresh(); });
$("#wf-approve").addEventListener("click", async () => {
  const run = state.status?.runs?.find((item) => item.runId === state.runId);
  if (run?.status !== "awaiting_approval" || !run.pendingApproval) return;
  const button = $("#wf-approve");
  button.disabled = true;
  try {
    const result = await api("/api/workflows/approve", { runId: run.runId, approvalToken: run.pendingApproval.token });
    if (!result.ok) toast(result.error, "err");
    await refresh();
  } finally {
    button.disabled = false;
  }
});
$("#wf-resume").addEventListener("click", async () => { state.lastRunStatus[state.runId] = "running"; await api("/api/workflows/resume", { runId: state.runId }); refresh(); });
$("#refresh-btn").addEventListener("click", () => refresh({ spin: true }));
$("#f-search").addEventListener("input", (e) => { state.filter.q = e.target.value; renderFindings(); });
$("#f-area").addEventListener("change", (e) => { state.filter.area = e.target.value; renderFindings(); });
$("#f-export").addEventListener("click", exportFindings);
$("#ex-model").addEventListener("input", (e) => { e.target.dataset.touched = "1"; renderExpert(); });
$("#ex-save").addEventListener("click", async () => {
  const data = await api("/api/model/config", { provider: state.provider, model: $("#ex-model").value.trim(), lang: state.lang });
  if (data.ok) { toast(t("t.saved"), "ok"); refresh(); } else toast(`❌ ${data.error}`, "err");
});
function resetChat() {
  state.chatEpoch += 1;
  state.chat = [];
  state.busy = false;
  $("#chat-send").disabled = false;
  renderChat();
}
$("#ex-clear").addEventListener("click", resetChat);
$("#chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (await send($("#chat-text").value)) $("#chat-text").value = "";
});
$("#chat-text").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#chat-form").requestSubmit(); } });
$("#ag-mission").addEventListener("change", refreshBridge);
$("#ag-target").addEventListener("input", refreshBridge);
$("#ag-launch").addEventListener("click", async () => {
  const data = await api("/api/launch-agent", { host: state.host, mission: $("#ag-mission").value, target: $("#ag-target").value, lang: state.lang });
  toast(data.ok ? t("t.launched") : (data.message ?? data.error ?? "").split("\n")[0], data.ok ? "ok" : "err");
  refresh();
});
$("#sys-rerun").addEventListener("click", loadDoctor);
document.addEventListener("keydown", (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "");
  if (e.key === "Escape" && typing) { document.activeElement.blur(); return; }
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^[1-7]$/.test(e.key)) setView(VIEWS[Number(e.key) - 1]);
  else if (e.key === "/") { e.preventDefault(); setView("findings"); $("#f-search").focus(); }
  else if (e.key.toLowerCase() === "r") refresh({ spin: true });
  else if (e.key.toLowerCase() === "l") { state.lang = state.lang === "pl" ? "en" : "pl"; applyLang(); }
});

/* ---------- start ---------- */
const initial = location.hash.slice(1);
if (VIEWS.includes(initial)) state.view = initial;
applyLang();
refresh().then(refreshBridge);
setInterval(() => {
  const busy = (state.status?.runs ?? []).some((r) => r.status === "running") || (state.status?.sessions ?? []).some((s) => s.status === "running");
  if (busy && !document.hidden) refresh();
}, 1500);
setInterval(() => { if (!document.hidden) refresh(); }, 20000);
