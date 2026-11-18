"use client";
import { useEffect, useRef, useState } from "react";
import { Bug, Pause, Play, FileText, ScanSearch, ShieldCheck, TriangleAlert, Wrench } from "lucide-react";
import type { Locale } from "@/lib/config";

type Row = { kind: "cmd" | "out" | "p0" | "p1" | "p2" | "ok" | "you"; text: [string, string] };
const stages: { id: string; icon: typeof ScanSearch; label: [string, string]; caption: [string, string]; rows: Row[] }[] = [
  {
    id: "scan", icon: ScanSearch, label: ["Scan", "Skan"],
    caption: ["With your consent, the agent checks lockfiles, live CVE databases and website headers.", "Za Twoją zgodą agent sprawdza lockfile, bazy podatności OSV/KEV oraz nagłówki strony."],
    rows: [
      { kind: "cmd", text: ["node tools/cda.mjs review --scope audit --name before", "node tools/cda.mjs review --scope audit --name before"] },
      { kind: "cmd", text: ["node tools/cda.mjs deps --scope audit --input package-lock.json --name deps", "node tools/cda.mjs deps --scope audit --input package-lock.json --name deps"] },
      { kind: "out", text: ["842 packages · npm · local read-only", "842 paczki · npm · odczyt lokalny"] },
      { kind: "cmd", text: ["node tools/cda.mjs advisories --inventory deps --name deps-vulns --share-package-names", "node tools/cda.mjs advisories --inventory deps --name deps-vulns --share-package-names"] },
      { kind: "out", text: ["OSV.dev + CISA KEV · 842 checked", "OSV.dev + CISA KEV · sprawdzono 842"] },
      { kind: "cmd", text: ["node tools/cda.mjs web --url https://shop.example --name site --authorized", "node tools/cda.mjs web --url https://sklep.example --name site --authorized"] },
      { kind: "out", text: ["3 passive GET requests · headers, cookies, TLS", "3 pasywne zapytania GET · nagłówki, cookies, TLS"] },
    ],
  },
  {
    id: "detect", icon: TriangleAlert, label: ["Detect", "Wykrycie"],
    caption: ["Every finding gets redacted evidence and a clear priority (P0–P3).", "Każde ustalenie otrzymuje zredagowany dowód oraz jasny priorytet (P0–P3)."],
    rows: [
      { kind: "p0", text: ["P0 expert review · public orders policy · model judgment", "P0 ocena ekspercka · publiczny dostęp do zamówień · ocena modelu"] },
      { kind: "p1", text: ["P1 expert review · order ownership check missing", "P1 ocena ekspercka · brak sprawdzenia właściciela zamówienia"] },
      { kind: "p1", text: ["P1 dependency · lodash 4.17.20 · CVE-2021-23337", "P1 zależność · lodash 4.17.20 · CVE-2021-23337"] },
      { kind: "p2", text: ["P2 ×5 website · cookie flags, CSP, HSTS", "P2 ×5 strona · flagi cookies, CSP, HSTS"] },
    ],
  },
  {
    id: "report", icon: FileText, label: ["Report", "Raport"],
    caption: ["Before changes, build an HTML report. PDF export needs separate permission to start the local browser.", "Przed zmianami powstaje raport HTML. PDF wymaga osobnej zgody na uruchomienie lokalnej przeglądarki."],
    rows: [
      { kind: "cmd", text: ["node tools/cda.mjs report --name audit-report --from before --from expert --from deps-vulns --from site --pdf", "node tools/cda.mjs report --name audit-report --from before --from expert --from deps-vulns --from site --lang pl --pdf"] },
      { kind: "ok", text: ["audit-report.pdf · priorities, evidence and coverage", "audit-report.pdf · priorytety, dowody i zakres"] },
      { kind: "out", text: ["dashboard.html updated", "dashboard.html zaktualizowany"] },
    ],
  },
  {
    id: "fix", icon: Wrench, label: ["Fix", "Poprawka"],
    caption: ["The agent prepares the exact diff and rollback plan. You decide when to apply it.", "Agent przygotowuje dokładną łatkę i plan cofnięcia. Ty decydujesz o wdrożeniu."],
    rows: [
      { kind: "you", text: ["you apply · ALTER TABLE orders ENABLE ROW LEVEL SECURITY", "wdrażasz · ALTER TABLE orders ENABLE ROW LEVEL SECURITY"] },
      { kind: "you", text: ["you apply · add ownership check in orders.ts", "wdrażasz · weryfikacja właściciela w orders.ts"] },
      { kind: "you", text: ["you apply · lodash 4.17.20 → 4.17.21", "wdrażasz · lodash 4.17.20 → 4.17.21"] },
    ],
  },
  {
    id: "verify", icon: ShieldCheck, label: ["Verify", "Weryfikacja"],
    caption: ["A local-rule retest needs fresh evidence. Expert and imported findings require their own verification.", "Retest lokalnych reguł wymaga świeżego dowodu. Ustalenia eksperckie i importowane potrzebują osobnej weryfikacji."],
    rows: [
      { kind: "cmd", text: ["node tools/cda.mjs review --scope audit --name after", "node tools/cda.mjs review --scope audit --name after"] },
      { kind: "cmd", text: ["node tools/cda.mjs retest --scope audit --before before --after after", "node tools/cda.mjs retest --scope audit --before before --after after"] },
      { kind: "ok", text: ["confirmed_fixed ×1 · local dependency rule", "confirmed_fixed ×1 · lokalna reguła zależności"] },
      { kind: "ok", text: ["Expert / imported findings: separate verification required", "Ustalenia eksperckie / importowane: osobna weryfikacja"] },
    ],
  },
];
const layers: [string, string][] = [["Database", "Baza danych"], ["Code", "Kod"], ["Dependencies", "Zależności"], ["Website", "Strona WWW"]];
const flagged: Record<number, number[]> = { 0: [5], 1: [9], 2: [2], 3: [6, 11] };

export function ScanTheater({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const i = pl ? 1 : 0;
  const [stage, setStage] = useState(0);
  const [auto, setAuto] = useState(false);
  const [held, setHeld] = useState(false);
  const region = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = region.current;
    if (!el) return;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => setAuto(visible && !document.hidden && !query.matches && document.documentElement.dataset.motion === "running");
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.3 });
    observer.observe(el);
    const mutation = new MutationObserver(update);
    mutation.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    query.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); mutation.disconnect(); query.removeEventListener("change", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  useEffect(() => {
    if (!auto || held) return;
    const id = setTimeout(() => setStage((value) => (value + 1) % stages.length), 1500);
    return () => clearTimeout(id);
  }, [auto, held, stage]);

  const current = stages[stage];
  return (
    <section className="theater-section section-shell" id="scan" aria-labelledby="theater-title">
      <div className="section-heading" data-reveal>
        <div>
          <span className="eyebrow">{pl ? "03 / JAK TO DZIAŁA" : "03 / HOW IT WORKS"}</span>
          <h2 id="theater-title">
            {pl ? "Pięć prostych kroków." : "Five clear steps."}
            <br />
            <span className="gradient-text">{pl ? "Od skanu do potwierdzenia." : "From scan to verified fix."}</span>
          </h2>
        </div>
        <p>
          {pl
            ? "Kliknij dowolny etap lub zobacz automatyczną symulację procesu audytu na danych przykładowych."
            : "Click any step or watch the automated audit workflow simulation on sample data."}
        </p>
      </div>
      <div className="theater" ref={region} data-stage={current.id} data-playing={auto && !held} data-agent-target="Scout" data-agent-label={pl ? "Uruchamianie audytu" : "Running the audit"}>
        <ol className="theater-steps" aria-label={pl ? "Kroki audytu" : "Audit steps"}>
          {stages.map(({ id, icon: Icon, label }, n) => (
            <li key={id}>
              <button type="button" aria-current={n === stage ? "step" : undefined} data-done={n < stage} onClick={() => { setStage(n); setHeld(true); }}>
                <span className="theater-num">{String(n + 1).padStart(2, "0")}</span>
                <Icon size={16} aria-hidden="true" />
                {label[i]}
              </button>
            </li>
          ))}
        </ol>
        <div className="theater-playback"><span>{pl ? "SYMULACJA • DANE PRZYKŁADOWE" : "SIMULATION • SAMPLE DATA"}</span><button type="button" aria-pressed={held} onClick={() => setHeld(value => !value)}>{held ? <Play size={15} /> : <Pause size={15} />}{pl ? (held ? "Wznów" : "Zatrzymaj") : (held ? "Resume" : "Pause")}</button></div>
        <div className="theater-body">
          <div className="scene" aria-hidden="true">
            <span className="demo-tag">{pl ? "WIZUALIZACJA / DEMO" : "VISUALISATION / DEMO"}</span>
            <div className="scene-status">{[pl ? "Otwieranie i skanowanie" : "Opening and scanning", pl ? "ALARM / wykryto ryzyko" : "ALERT / risk detected", pl ? "Dowód zapisany w raporcie" : "Evidence captured", pl ? "Propozycja poprawki • Twoja decyzja" : "Proposed fix • your decision", pl ? "Retest / poprawka potwierdzona" : "Retest / fix confirmed"][stage]}</div>
            <div className="scene-world">
              {layers.map((label, layer) => (
                <div className="scene-layer" key={label[0]} style={{ "--z": layer } as React.CSSProperties}>
                  <span className="scene-label">{label[i]}</span>
                  {Array.from({ length: 15 }, (_, node) => (
                    <i key={node} data-flag={flagged[layer].includes(node) ? (layer === 0 ? "p0" : layer === 3 ? "p2" : "p1") : undefined} />
                  ))}
                </div>
              ))}
              <div className="scene-beam" />
            </div>
            <div className="scene-shield">
              {stage === 1 ? <Bug size={30} /> : stage === 3 ? <Wrench size={30} /> : <ShieldCheck size={30} strokeWidth={1.4} />}
            </div>
            <div className="scene-doc">
              <FileText size={18} />
              <span>audit-report.pdf</span>
            </div>
          </div>
          <div className="theater-terminal" role="group" aria-label={`${pl ? "Krok" : "Step"} ${stage + 1}: ${current.label[i]}`}>
            <div className="terminal-bar">
              <span className="live-dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="mono">agent · cyber-defense</span>
              <span className="mono theater-stage">{String(stage + 1).padStart(2, "0")} / 05 · {current.label[i].toUpperCase()}</span>
            </div>
            <div className="terminal-rows" key={current.id}>
              {current.rows.map((row, n) => (
                <div key={n} className={`trow trow-${row.kind}`} style={{ "--row": n } as React.CSSProperties}>
                  {row.kind === "cmd" && <span className="live-prompt" aria-hidden="true">$</span>}
                  <code>{row.text[i]}</code>
                </div>
              ))}
            </div>
            <p className="theater-caption" key={`${current.id}-caption`}>{current.caption[i]}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
