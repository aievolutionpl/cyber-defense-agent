import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { deny } from "./scope.mjs";
import { redact } from "./redact.mjs";
import { coverageOf } from "./comparison.mjs";

export const PRIORITIES = ["P0", "P1", "P2", "P3", "IDEA"];
export const AREAS = ["code", "dependencies", "software", "website", "database", "network", "host", "other"];
const esc = (value) => redact(value ?? "").replace(/[&<>"'`]/g, (c) => `&#${c.charCodeAt(0)};`);
const clip = (value, max) => String(value ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);
// Redact the whole input first: clipping can cut off the closing marker a secret pattern needs.
// Control characters are normalised before matching so they cannot split a pattern either.
// An unterminated private-key block is still a key, so everything from its opening marker goes.
const safe = (value, max) => clip(redact(String(value ?? "").slice(0, 64_000).replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, " ")).replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*/g, "[REDACTED KEY]"), max);

/** One expert-review finding recorded by the agent. Bounded, redacted, always labelled model judgment. */
export function expertFinding(existing, input, now = Date.now()) {
  const report = existing ?? { format: "cda.expert.v1", createdAt: new Date(now).toISOString(), findings: [] };
  if (report.format !== "cda.expert.v1" || !Array.isArray(report.findings)) deny("INVALID_EXPERT_REPORT");
  if (report.findings.length >= 200) deny("TOO_MANY_FINDINGS");
  const priority = String(input.priority ?? "").toUpperCase();
  const area = String(input.area ?? "other").toLowerCase();
  const title = safe(input.title, 160);
  if (!PRIORITIES.includes(priority) || !AREAS.includes(area) || !title || !safe(input.fix, 600)) deny("INVALID_FINDING");
  report.findings.push({
    priority, area, title,
    impact: safe(input.impact, 400), evidence: safe(input.evidence, 500),
    fix: safe(input.fix, 600), verify: safe(input.verify, 300),
    basis: "expert review - model judgment", recordedAt: new Date(now).toISOString(),
  });
  report.updatedAt = new Date(now).toISOString();
  return report;
}

const PORT_FIX = "If only this machine uses the service, bind it to localhost; otherwise restrict it with the firewall and confirm it is not forwarded from the internet.";

/** Turns every supported report into one flat, comparable list. Unknown formats are ignored. */
export function collect(named, { rootKey } = {}) {
  const findings = [];
  const sources = [];
  const verified = [];
  const limitations = new Set();
  const stats = { packages: 0, checked: 0, notChecked: 0, requests: 0, files: 0 };
  const incomplete = [];
  const add = (source, f) => findings.push({ impact: "", evidence: "", fix: "", verify: "", basis: "tool evidence", ...f, source });
  const time = (r) => Date.parse(r.updatedAt ?? r.createdAt ?? r.observedAt ?? "") || 0;
  for (const [name, r] of named) {
    if (!r || typeof r !== "object") continue;
    if (rootKey && r.scope?.rootKey !== rootKey) continue;
    let kind = null;
    if (r.format === "cda.report.v1" && Array.isArray(r.findings)) {
      kind = r.source === "local-review" ? "Local file review" : "Imported scanner report";
      stats.files += r.scope?.files?.length ?? 0;
      if (coverageOf(r).status === "incomplete") incomplete.push(name);
      const root = r.scope?.rootKey ?? "";
      for (const f of r.findings) add(name, { priority: f.priority, area: "code", title: f.title ?? f.ruleId, evidence: `${f.path}:${f.line} - ${f.evidence ?? f.ruleId}`, fix: f.fix ?? "Review this location in the original scanner report.", verify: "Repeat the same check and run retest.", ref: root ? `${root}:${f.ruleId}:${f.path}` : null, loc: root ? `${root}:${f.ruleId}:${f.path}:${r.scanner ? f.fingerprint ?? f.line : f.line}` : null, at: time(r) });
    } else if (r.format === "cda.retest.v1" && Array.isArray(r.results)) {
      kind = "Retest";
      const root = r.scope?.rootKey ?? "";
      for (const x of r.results) verified.push({ ref: root ? `${root}:${x.ruleId}:${x.path}` : null, label: `${x.ruleId} - ${x.path}`, status: x.status, source: name, at: time(r) });
      for (const f of r.results.filter((x) => x.status === "still_present")) add(name, { priority: f.priority, area: "code", title: `Still present: ${f.ruleId}`, evidence: `${f.path}:${f.line ?? 1}`, fix: "Review the finding and repeat the local check after remediation.", verify: "Repeat the same check and run retest.", ref: root ? `${root}:${f.ruleId}:${f.path}` : null, loc: root ? `${root}:${f.ruleId}:${f.path}:${f.line ?? 1}` : null, added: true, at: time(r) });
      // A retest can also discover something new. It is an open finding, not a footnote.
      for (const f of Array.isArray(r.added) ? r.added : []) add(name, { priority: f.priority, area: "code", title: `New since the baseline: ${f.title ?? f.ruleId}`, evidence: `${f.path}:${f.line} - ${f.evidence ?? f.ruleId}`, fix: f.fix ?? "Review this location and fix it, then retest.", verify: "Repeat the same check and run retest.", ref: root ? `${root}:${f.ruleId}:${f.path}` : null, loc: root ? `${root}:${f.ruleId}:${f.path}:${f.line}` : null, added: true, at: time(r) });
    } else if (r.format === "cda.advisories.v1" && Array.isArray(r.findings)) {
      kind = "Known-vulnerability lookup (OSV.dev, CISA KEV)";
      stats.checked += r.checked ?? 0;
      stats.notChecked += (r.manualLookup?.total ?? 0) + (r.vendorCatalogChecked ?? 0);
      if (r.incomplete || r.vendorCatalogChecked || r.findings.some((finding) => finding.ecosystem === "Windows:VendorCatalog")) incomplete.push(name);
      const area = r.inventory?.kind === "project" ? "dependencies" : "software";
      for (const f of r.findings) {
        if (f.ecosystem === "Windows:VendorCatalog") continue;
        const channelHint = f.updateUrl
          ? ` Download: ${f.updateUrl}${f.wingetId ? ` (or run: winget upgrade --id ${f.wingetId})` : ""}.`
          : "";
        add(name, {
          priority: f.priority,
          area,
          title: `${f.package} ${f.installed}: ${f.id}${f.knownExploited ? " - exploited in the wild" : ""}`,
          impact: f.summary,
          evidence: `Installed version is inside a published affected range. Severity ${f.severity}${f.cvss != null ? ` (CVSS ${f.cvss})` : ""}. Known exploited: ${f.knownExploited === true ? "yes" : f.knownExploited === false ? "no" : "unknown"}.`,
          fix: (f.fixedIn?.length ? `Update to ${f.fixedIn.join(" or ")} or later through the official channel.` : "Update to the vendor's fixed release; see the advisory.") + channelHint,
          verify: "Collect a fresh inventory and re-run advisories.",
        });
      }
    } else if (r.format === "cda.web.v1" && Array.isArray(r.findings)) {
      kind = `Website posture check - ${clip(r.finalUrl, 80)}`;
      stats.requests += r.policy?.requests ?? 0;
      for (const f of r.findings) add(name, { priority: f.priority, area: "website", title: f.title, evidence: `${f.id}: ${f.evidence}`, fix: f.fix, verify: "Re-run the website check and compare finding IDs." });
    } else if (r.format === "cda.inventory.v1" && Array.isArray(r.packages)) {
      kind = r.kind === "host" ? "Machine inventory" : "Dependency inventory";
      stats.packages += r.total ?? r.packages.length;
      for (const p of r.listeners?.ports ?? []) if (p.exposure === "network-reachable" && p.note) add(name, { priority: "P2", area: "network", title: `Port ${p.port} (${p.note}) is reachable from the network`, evidence: "Listening on a non-loopback address on this machine.", fix: PORT_FIX, verify: "Re-run inventory and check the listening ports." });
    } else if (r.format === "cda.update-plan.v1" && Array.isArray(r.packages)) {
      kind = "Update plan from a supplied inventory";
      for (const p of r.packages) if (p.status === "update_reported") add(name, { priority: p.priority ?? "P2", area: "software", title: `${p.name}: update reported ${p.installed} -> ${p.available}`, evidence: `Operator-supplied inventory (${p.classification}); not independently verified.`, fix: "Confirm against the vendor catalog, back up, then update through the normal management tool.", verify: "Collect a fresh inventory after the change." });
    } else if (r.format === "cda.expert.v1" && Array.isArray(r.findings)) {
      kind = "Expert review (model judgment)";
      for (const f of r.findings) add(name, { ...f });
    }
    if (!kind) continue;
    sources.push({ name, kind, rootKey: r.scope?.rootKey ?? null, createdAt: r.updatedAt ?? r.createdAt ?? r.observedAt ?? "" });
    for (const text of r.limitations ?? []) limitations.add(clip(text, 300));
  }
  // A confirmed fix closes a finding only for the same approved root, rule and file, and only when the
  // retest is newer than the report that raised it. Anything else stays open.
  const latest = new Map();
  const fixedAt = new Map();
  const statusRank = { confirmed_fixed: 0, insufficient_data: 1, still_present: 2 };
  for (const v of verified) {
    if (!v.ref || !v.at) continue;
    const prior = latest.get(v.ref);
    if (!prior || v.at > prior.at || (v.at === prior.at && (statusRank[v.status] ?? 1) > (statusRank[prior.status] ?? 1))) latest.set(v.ref, v);
    if (v.status === "confirmed_fixed") fixedAt.set(v.ref, Math.max(fixedAt.get(v.ref) ?? 0, v.at));
  }
  const seen = new Map();
  for (const f of findings) {
    if (!PRIORITIES.includes(f.priority)) f.priority = "P3";
    if (!AREAS.includes(f.area)) f.area = "other";
    const verification = latest.get(f.ref);
    if (f.at && verification?.status === "confirmed_fixed" && verification.at > f.at) continue;
    f.status = f.ref && f.at > (fixedAt.get(f.ref) ?? Infinity) ? "reopened" : "open";
    // Same defect reported twice collapses; the same rule in another file or line does not.
    // A location seen in both an after-report and a retest is one finding; keep the richer report entry.
    const key = f.loc ?? `${f.source}\u0000${f.area}\u0000${f.title}\u0000${f.evidence}`;
    const prior = seen.get(key);
    if (f.added && prior) continue;
    // Two reports about one location: the stronger priority wins, then the newer report.
    // Argument order and file names never decide, so a weaker import cannot downgrade a finding.
    if (prior && !prior.added) {
      const rank = PRIORITIES.indexOf(f.priority) - PRIORITIES.indexOf(prior.priority);
      if (rank > 0 || (rank === 0 && (f.at ?? 0) <= (prior.at ?? 0))) continue;
    }
    seen.set(key, f);
  }
  const open = [...seen.values()].sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) || a.area.localeCompare(b.area));
  const currentVerification = [...latest.values()].map((v) => {
    const observations = open.filter((f) => f.ref === v.ref && f.at >= v.at);
    return observations.length ? { ...v, status: v.status === "confirmed_fixed" ? "reopened" : "still_present" } : v;
  });
  // Legacy retests without an asset or timestamp stay visible but cannot close any finding.
  for (const v of verified) if (!v.ref || !v.at) currentVerification.push({ ...v, status: "insufficient_data" });
  if (currentVerification.some((v) => v.status === "insufficient_data")) incomplete.push("retest");
  const counts = Object.fromEntries(PRIORITIES.map((p) => [p, open.filter((f) => f.priority === p).length]));
  const areas = AREAS.map((a) => [a, open.filter((f) => f.area === a && f.priority !== "IDEA").length]).filter(([, n]) => n);
  const verdict = counts.P0 ? "act" : counts.P1 ? "attention" : counts.P2 || counts.P3 ? "routine" : incomplete.length ? "incomplete" : "clear";
  return { findings: open.slice(0, 400), total: open.length, counts, areas, verdict, verified: currentVerification, sources, stats, incomplete: [...new Set(incomplete)], limitations: [...limitations].slice(0, 14) };
}

const T = {
  en: {
    report: "Security audit report", dashboard: "Defense dashboard", generated: "Generated", sources: "evidence sources",
    verdict: { act: "Act today", attention: "Needs attention this week", routine: "Routine maintenance", clear: "No findings in the checked scope", incomplete: "Incomplete coverage: review missing checks" },
    verdictNote: { act: "At least one issue is critical or actively exploited.", attention: "High-priority issues were found.", routine: "Only medium and low priority items were found.", clear: "This is not proof of security. See coverage.", incomplete: "Some results were truncated or unavailable, so no conclusion can be drawn yet." },
    incompleteNote: "Incomplete checks or unverified scanner coverage. Review the source reports before relying on these totals. Reports:",
    status: { open: "Open", reopened: "Problem returned" }, open: "Open findings", fixed: "Confirmed fixes", checked: "Packages checked", listed: "Packages listed", ideas: "Improvement ideas",
    top: "Start here", topSub: "The three things that matter most", by: "Where the risk is", findings: "Findings", improve: "Worth improving",
    what: "What could happen", saw: "What was observed", fix: "How to fix it", verify: "How to verify", verified: "Verification", coverage: "Coverage and limits",
    notChecked: "packages had no machine-readable feed and were not checked automatically.", none: "Nothing in this category.",
    footer: "Read-only defensive check. Findings are signals to investigate, not a security certification. A missing finding is not proof of safety. You apply every change yourself.",
    area: { code: "Code", dependencies: "Dependencies", software: "Installed software", website: "Website", database: "Database", network: "Network", host: "This machine", other: "Other" },
    live: "Refreshes automatically while your agent works", reports: "Reports", empty: "No reports yet. Ask your agent to run a first check.", more: "more in the JSON reports",
  },
  pl: {
    report: "Raport z audytu bezpieczeństwa", dashboard: "Panel obrony", generated: "Wygenerowano", sources: "źródeł dowodów",
    verdict: { act: "Działaj dziś", attention: "Wymaga uwagi w tym tygodniu", routine: "Rutynowa konserwacja", clear: "Brak ustaleń w sprawdzonym zakresie", incomplete: "Niepełne: uruchom sprawdzenie ponownie" },
    verdictNote: { act: "Co najmniej jeden problem jest krytyczny lub aktywnie wykorzystywany.", attention: "Znaleziono problemy o wysokim priorytecie.", routine: "Znaleziono tylko pozycje o średnim i niskim priorytecie.", clear: "To nie jest dowód bezpieczeństwa. Zobacz pokrycie.", incomplete: "Część wyników została obcięta lub była niedostępna, więc nie można jeszcze wyciągać wniosków." },
    incompleteNote: "Niepełne kontrole lub niezweryfikowane pokrycie skanera. Sprawdź raporty źródłowe przed oceną wyników. Raporty:",
    status: { open: "Otwarte", reopened: "Problem powrócił" }, open: "Otwarte ustalenia", fixed: "Potwierdzone poprawki", checked: "Sprawdzone pakiety", listed: "Pakiety na liście", ideas: "Pomysły na ulepszenia",
    top: "Zacznij tutaj", topSub: "Trzy najważniejsze rzeczy", by: "Gdzie jest ryzyko", findings: "Ustalenia", improve: "Warto dopracować",
    what: "Co może się stać", saw: "Co zaobserwowano", fix: "Jak to naprawić", verify: "Jak sprawdzić poprawkę", verified: "Weryfikacja", coverage: "Pokrycie i ograniczenia",
    notChecked: "pakietów nie ma publicznej bazy i nie zostało sprawdzonych automatycznie.", none: "Brak pozycji w tej kategorii.",
    footer: "Defensywna kontrola tylko do odczytu. Ustalenia są sygnałami do zbadania, a nie certyfikatem bezpieczeństwa. Brak ustalenia nie dowodzi bezpieczeństwa. Każdą zmianę wdrażasz samodzielnie.",
    area: { code: "Kod", dependencies: "Zależności", software: "Zainstalowane programy", website: "Strona WWW", database: "Baza danych", network: "Sieć", host: "Ten komputer", other: "Inne" },
    live: "Odświeża się automatycznie, gdy agent pracuje", reports: "Raporty", empty: "Brak raportów. Poproś agenta o pierwszą kontrolę.", more: "więcej w raportach JSON",
  },
};
const COLOR = { P0: "#ff8a75", P1: "#f5c56b", P2: "#7cc8f0", P3: "#8fe0b0", IDEA: "#b9a8f5" };

function donut(counts) {
  const order = ["P0", "P1", "P2", "P3"];
  const total = order.reduce((n, p) => n + counts[p], 0);
  const C = 2 * Math.PI * 52;
  let offset = 0;
  const arcs = order.map((p) => {
    const length = total ? (counts[p] / total) * C : 0;
    const arc = length ? `<circle cx="70" cy="70" r="52" fill="none" stroke="${COLOR[p]}" stroke-width="15" stroke-dasharray="${length.toFixed(2)} ${(C - length).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 70 70)"/>` : "";
    offset += length;
    return arc;
  }).join("");
  return `<svg class="donut" viewBox="0 0 140 140" role="img" aria-label="P0 ${counts.P0}, P1 ${counts.P1}, P2 ${counts.P2}, P3 ${counts.P3}"><circle cx="70" cy="70" r="52" fill="none" stroke="#22302a" stroke-width="15"/>${arcs}<text x="70" y="68" text-anchor="middle" class="donut-n">${total}</text><text x="70" y="88" text-anchor="middle" class="donut-l">P0-P3</text></svg>`;
}

const CSS = `@page{size:A4;margin:0}*{box-sizing:border-box}html{background:#090e0c;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font:14px/1.6 "Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;color:#e9f1ea;background:radial-gradient(900px 500px at 85% -5%,#1d5a3c55,transparent 60%),radial-gradient(700px 420px at 0% 0%,#4b3a8a33,transparent 60%),#090e0c}
.page{max-width:1080px;margin:0 auto;padding:44px 48px 36px}.mono{font-family:ui-monospace,"Cascadia Mono","SF Mono",Menlo,Consolas,monospace}
header{display:flex;justify-content:space-between;align-items:center;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9fb3a6}
.brand{display:flex;align-items:center;gap:10px;color:#b8f0c8;font-weight:700}.brand svg{width:22px;height:24px}
h1{font-size:40px;line-height:1.08;letter-spacing:-.035em;margin:34px 0 8px;font-weight:700}.sub{color:#9fb3a6;margin:0 0 26px}
.hero{display:grid;grid-template-columns:1.25fr .75fr;gap:18px;align-items:stretch}
.card{border:1px solid #2b3a31;border-radius:16px;background:linear-gradient(180deg,#141c17f2,#0e1411f2);padding:22px 24px;break-inside:avoid}
.verdict{position:relative;overflow:hidden}.verdict:before{content:"";position:absolute;inset:0 auto 0 0;width:5px;background:var(--v)}
.verdict>b{display:block;font-size:26px;letter-spacing:-.02em;color:var(--v);margin-bottom:4px}.verdict p{margin:0;color:#b7c6bb}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}.kpi{border:1px solid #26342b;border-radius:12px;padding:12px 14px;background:#0c120f}
.kpi b{display:block;font-size:26px;line-height:1.1;letter-spacing:-.03em}.kpi span{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#8fa096}
.ring{display:flex;align-items:center;gap:18px}.donut{width:150px;height:150px;flex:none}.donut-n{font:700 30px "Segoe UI",system-ui,sans-serif;fill:#e9f1ea}.donut-l{font:10px ui-monospace,Menlo,monospace;fill:#8fa096;letter-spacing:.12em}
.legend{display:grid;gap:7px;font-size:12.5px;white-space:nowrap}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px}
h2{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#9fe0b6;margin:34px 0 4px}h2+.lead{margin:0 0 14px;font-size:22px;letter-spacing:-.02em;font-weight:650}
.top{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.top .card{padding:18px}.top h3{font-size:15px;line-height:1.35;margin:10px 0 8px}.top p{margin:0;font-size:12.5px;color:#b7c6bb}
.tag{display:inline-block;font:700 10.5px ui-monospace,Menlo,monospace;border:1px solid currentColor;border-radius:6px;padding:2px 7px;color:var(--c);background:#0b100d}
.bars{display:grid;gap:9px}.bar{display:grid;grid-template-columns:170px 1fr 34px;gap:12px;align-items:center;font-size:12.5px}.bar div{height:9px;border-radius:99px;background:#1b2620;overflow:hidden}.bar div i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#6fd79f,#b9a8f5)}
.finding{border-left:4px solid var(--c);margin-top:12px}.finding h3{font-size:16.5px;line-height:1.35;margin:8px 0 12px;letter-spacing:-.01em}
.meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:11px;color:#8fa096}.chip{border:1px solid #33473b;border-radius:99px;padding:2px 9px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 22px}.grid div b{display:block;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#8fa096;margin-bottom:2px}.grid p{margin:0;font-size:13px;color:#d5e0d7;overflow-wrap:anywhere}.grid .fix p{color:#c6f1d2}
table{width:100%;border-collapse:collapse;font-size:12.5px}td,th{text-align:left;padding:8px 10px;border-bottom:1px solid #223028;overflow-wrap:anywhere}th{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#8fa096;font-weight:600}
ul.lim{margin:10px 0 0;padding-left:18px;color:#a9b9ad;font-size:12.5px}footer{margin-top:34px;padding-top:16px;border-top:1px solid #223028;font-size:11.5px;color:#8fa096}
.ok{color:#8fe0b0}.warn{color:#f5c56b}.live{display:inline-flex;align-items:center;gap:8px}.live:before{content:"";width:8px;height:8px;border-radius:50%;background:#6fd79f;box-shadow:0 0 0 0 #6fd79f88;animation:pulse 1.8s infinite}
@keyframes pulse{70%{box-shadow:0 0 0 9px #6fd79f00}}@keyframes rise{from{opacity:0;transform:translateY(10px)}}
@media screen{.card{animation:rise .5s both}.top .card:nth-child(2){animation-delay:.06s}.top .card:nth-child(3){animation-delay:.12s}}
@media screen and (max-width:760px){.page{padding:24px 16px}.hero,.top,.grid{grid-template-columns:1fr}.kpis{grid-template-columns:repeat(2,1fr)}.bar{grid-template-columns:110px 1fr 28px}h1{font-size:30px}}
@media print{.page{padding:34px 38px;max-width:none}.card{animation:none}h2,h2+.lead{break-after:avoid}.kpis{grid-template-columns:repeat(2,1fr)}.hero{grid-template-columns:1.35fr .65fr}.donut{width:120px;height:120px}h1{font-size:34px}.finding h3{font-size:15px}}@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
const MARK = `<svg viewBox="0 0 40 44" fill="none" aria-hidden="true"><path d="M20 3 35 9v12c0 9-6.5 15.5-15 20C11.5 36.5 5 30 5 21V9L20 3Z" stroke="currentColor" stroke-width="2.4"/><path d="m13 21 5 5 10-11" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Self-contained dark HTML: no scripts, no external resources. Every dynamic string is escaped. */
export function renderVisual(data, { title, lang = "en", mode = "report", now = Date.now() } = {}) {
  const t = T[lang] ?? T.en;
  const dash = mode === "dashboard";
  const vColor = { act: COLOR.P0, attention: COLOR.P1, routine: COLOR.P2, clear: COLOR.P3, incomplete: COLOR.P1 }[data.verdict];
  const real = data.findings.filter((f) => f.priority !== "IDEA" && f.priority !== "P3");
  const soft = data.findings.filter((f) => f.priority === "IDEA" || f.priority === "P3");
  const fixedCount = data.verified.filter((v) => v.status === "confirmed_fixed").length;
  const card = (f) => `<article class="card finding" style="--c:${COLOR[f.priority]}"><div class="meta"><span class="tag">${f.priority}</span><span class="chip">${esc(t.area[f.area])}</span><span class="chip">${esc(f.basis)}</span><span class="chip">${esc(t.status[f.status] ?? t.status.open)}</span><span class="mono">${esc(f.source)}</span></div><h3>${esc(f.title)}</h3><div class="grid">${f.impact ? `<div><b>${t.what}</b><p>${esc(f.impact)}</p></div>` : ""}${f.evidence ? `<div><b>${t.saw}</b><p>${esc(f.evidence)}</p></div>` : ""}<div class="fix"><b>${t.fix}</b><p>${esc(f.fix)}</p></div>${f.verify ? `<div><b>${t.verify}</b><p>${esc(f.verify)}</p></div>` : ""}</div></article>`;
  const max = Math.max(1, ...data.areas.map(([, n]) => n));
  const hidden = data.total - data.findings.length;
  return `<!doctype html><html lang="${lang === "pl" ? "pl" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">${dash ? '<meta http-equiv="refresh" content="5">' : ""}<title>${esc(title ?? (dash ? t.dashboard : t.report))}</title><style>${CSS}</style></head><body><div class="page">
<header><span class="brand">${MARK}Cyber Defense Agent</span><span>${dash ? `<span class="live">${t.live}</span>` : `${t.generated} ${esc(new Date(now).toISOString().slice(0, 16).replace("T", " "))} UTC`}</span></header>
<h1>${esc(title ?? (dash ? t.dashboard : t.report))}</h1><p class="sub">${data.sources.length} ${t.sources}${data.sources.length ? ": " + esc(data.sources.map((s) => s.kind).filter((k, i, a) => a.indexOf(k) === i).join(" · ")) : ""}</p>
${!data.sources.length ? `<div class="card"><p>${t.empty}</p></div>` : `${data.incomplete.length ? `<div class="card" style="border-color:${COLOR.P1};margin-bottom:14px"><p class="warn" style="margin:0">${t.incompleteNote} <span class="mono">${esc(data.incomplete.join(", "))}</span></p></div>` : ""}<section class="hero"><div class="card verdict" style="--v:${vColor}"><b>${t.verdict[data.verdict]}</b><p>${t.verdictNote[data.verdict]}</p><div class="kpis"><div class="kpi"><b>${data.total - data.counts.IDEA}</b><span>${t.open}</span></div><div class="kpi"><b class="ok">${fixedCount}</b><span>${t.fixed}</span></div><div class="kpi"><b>${data.stats.checked || data.stats.packages}</b><span>${data.stats.checked ? t.checked : t.listed}</span></div><div class="kpi"><b>${data.counts.IDEA}</b><span>${t.ideas}</span></div></div></div>
<div class="card ring">${donut(data.counts)}<div class="legend">${["P0", "P1", "P2", "P3"].map((p) => `<span><i style="background:${COLOR[p]}"></i>${p} &nbsp;<b>${data.counts[p]}</b></span>`).join("")}</div></div></section>
${data.findings.length ? `<h2>${t.top}</h2><p class="lead">${t.topSub}</p><section class="top">${data.findings.slice(0, 3).map((f) => `<div class="card" style="--c:${COLOR[f.priority]}"><span class="tag">${f.priority}</span><h3>${esc(f.title)}</h3><p>${esc(f.fix)}</p></div>`).join("")}</section>` : ""}
${data.areas.length ? `<h2>${t.by}</h2><div class="card bars">${data.areas.map(([a, n]) => `<div class="bar"><span>${esc(t.area[a])}</span><div><i style="width:${Math.round((n / max) * 100)}%"></i></div><b>${n}</b></div>`).join("")}</div>` : ""}
<h2>${t.findings}</h2>${real.length ? real.map(card).join("") : `<div class="card"><p>${t.none}</p></div>`}
${soft.length ? `<h2>${t.improve}</h2>${soft.map(card).join("")}` : ""}${hidden > 0 ? `<p class="sub">+${hidden} ${t.more}</p>` : ""}
${data.verified.length ? `<h2>${t.verified}</h2><div class="card"><table><tr><th>Check</th><th>Status</th><th>Report</th></tr>${data.verified.map((v) => `<tr><td class="mono">${esc(v.label)}</td><td class="${v.status === "confirmed_fixed" ? "ok" : "warn"}">${esc(v.status)}</td><td class="mono">${esc(v.source)}</td></tr>`).join("")}</table></div>` : ""}
<h2>${dash ? t.reports : t.coverage}</h2><div class="card"><table><tr><th>Report</th><th>Evidence</th><th>Date</th></tr>${data.sources.map((s) => `<tr><td class="mono">${esc(s.name)}</td><td>${esc(s.kind)}</td><td class="mono">${esc(String(s.createdAt).slice(0, 16).replace("T", " "))}</td></tr>`).join("")}</table>${data.stats.notChecked ? `<p class="warn" style="margin:12px 0 0">${data.stats.notChecked} ${t.notChecked}</p>` : ""}<ul class="lim">${data.limitations.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></div>`}
<footer>${t.footer}</footer></div></body></html>`;
}

const BROWSERS = {
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium", "/usr/bin/microsoft-edge", "/opt/pw-browsers/chromium"],
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"],
  win32: ["C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"],
};
function executable(candidate) {
  try {
    const stat = fs.statSync(candidate);
    if (stat.isFile()) return candidate;
    // A Playwright-style folder: look one or two levels down for the binary.
    for (const entry of fs.readdirSync(candidate)) for (const rel of ["chrome-linux/chrome", "chrome-linux64/chrome", "chrome"]) {
      const nested = path.join(candidate, entry, rel);
      if (fs.existsSync(nested) && fs.statSync(nested).isFile()) return nested;
    }
  } catch { /* not present */ }
  return null;
}
export function findBrowser(platform = process.platform, env = process.env) {
  for (const candidate of [env.CDA_BROWSER, ...(BROWSERS[platform] ?? [])]) {
    const found = candidate && executable(candidate);
    if (found) return found;
  }
  return null;
}

/** Prints our own generated HTML file to PDF with a locally installed Chromium-based browser. No network, no other page. */
export function printPdf(htmlFile, pdfFile, { browser = findBrowser(), run = execFileSync } = {}) {
  if (!browser) return { pdf: false, reason: "NO_CHROMIUM_BROWSER_FOUND" };
  const args = ["--headless", "--disable-gpu", "--no-pdf-header-footer", "--disable-extensions", "--no-first-run", `--print-to-pdf=${pdfFile}`];
  if (process.platform === "linux" && process.getuid?.() === 0) args.push("--no-sandbox");
  args.push(pathToFileURL(htmlFile).href);
  try {
    run(browser, args, { timeout: 90_000, stdio: "ignore", windowsHide: true, shell: false });
  } catch {
    return { pdf: false, reason: "PDF_PRINT_FAILED" };
  }
  return fs.existsSync(pdfFile) && fs.statSync(pdfFile).size > 1000 ? { pdf: true } : { pdf: false, reason: "PDF_PRINT_FAILED" };
}
