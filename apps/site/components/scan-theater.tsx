"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, ScanSearch, ShieldCheck, TriangleAlert, Wrench } from "lucide-react";
import type { Locale } from "@/lib/config";

type Row = { kind: "cmd" | "out" | "p0" | "p1" | "p2" | "ok" | "you"; text: [string, string] };
const stages: { id: string; icon: typeof ScanSearch; label: [string, string]; caption: [string, string]; rows: Row[] }[] = [
  {
    id: "scan", icon: ScanSearch, label: ["Scan", "Skan"],
    caption: ["With your consent the agent reads the lockfile, checks live vulnerability databases and looks at your site like a browser would.", "Za Twoją zgodą agent czyta lockfile, sprawdza aktualne bazy podatności i ogląda Twoją stronę tak, jak przeglądarka."],
    rows: [
      { kind: "cmd", text: ["node tools/cda.mjs deps --scope audit --input package-lock.json", "node tools/cda.mjs deps --scope audit --input package-lock.json"] },
      { kind: "out", text: ["842 packages · npm · nothing left the machine", "842 paczki · npm · nic nie opuściło komputera"] },
      { kind: "cmd", text: ["node tools/cda.mjs advisories --inventory deps --share-package-names", "node tools/cda.mjs advisories --inventory deps --share-package-names"] },
      { kind: "out", text: ["OSV.dev + CISA KEV · 842 checked", "OSV.dev + CISA KEV · sprawdzono 842"] },
      { kind: "cmd", text: ["node tools/cda.mjs web --url https://shop.example --authorized", "node tools/cda.mjs web --url https://sklep.example --authorized"] },
      { kind: "out", text: ["3 requests · headers, cookies, TLS", "3 zapytania · nagłówki, ciasteczka, TLS"] },
    ],
  },
  {
    id: "detect", icon: TriangleAlert, label: ["Detect", "Wykrycie"],
    caption: ["Signals become findings with evidence and a priority. What the tools cannot see, the agent reviews by playbook and labels as its own judgment.", "Sygnały stają się ustaleniami z dowodem i priorytetem. Czego narzędzia nie widzą, agent sprawdza według playbooka i oznacza jako własną ocenę."],
    rows: [
      { kind: "p0", text: ["P0 database · orders table readable by anyone (RLS off)", "P0 baza · tabela zamówień czytelna dla każdego (RLS wyłączone)"] },
      { kind: "p1", text: ["P1 code · order lookup trusts the ID in the URL", "P1 kod · podgląd zamówienia ufa ID z adresu"] },
      { kind: "p1", text: ["P1 dependency · lodash 4.17.20 · CVE-2021-23337", "P1 zależność · lodash 4.17.20 · CVE-2021-23337"] },
      { kind: "p2", text: ["P2 ×5 website · cookie flags, CSP, HSTS", "P2 ×5 strona · flagi ciasteczek, CSP, HSTS"] },
    ],
  },
  {
    id: "report", icon: FileText, label: ["Report", "Raport"],
    caption: ["Before anything is fixed you get a dark, visual PDF: the verdict, the three things to start with, every fix and how to verify it.", "Zanim cokolwiek zostanie naprawione, dostajesz ciemny, wizualny PDF: werdykt, trzy rzeczy na start, każdą poprawkę i sposób jej sprawdzenia."],
    rows: [
      { kind: "cmd", text: ["node tools/cda.mjs report --name audit-report --from deps-vulns --from site --from expert", "node tools/cda.mjs report --name audit-report --from deps-vulns --from site --from expert --lang pl"] },
      { kind: "ok", text: ["audit-report.pdf · verdict: act today · 10 findings · 2 ideas", "audit-report.pdf · werdykt: działaj dziś · 10 ustaleń · 2 pomysły"] },
      { kind: "out", text: ["dashboard.html refreshed", "dashboard.html odświeżony"] },
    ],
  },
  {
    id: "fix", icon: Wrench, label: ["Fix", "Poprawka"],
    caption: ["The agent prepares each exact change with a rollback. You apply it in your normal workflow. The tools themselves change nothing.", "Agent przygotowuje każdą dokładną zmianę wraz ze sposobem cofnięcia. Wdrażasz ją w swoim zwykłym trybie pracy. Same narzędzia niczego nie zmieniają."],
    rows: [
      { kind: "you", text: ["you apply · ALTER TABLE orders ENABLE ROW LEVEL SECURITY", "wdrażasz · ALTER TABLE orders ENABLE ROW LEVEL SECURITY"] },
      { kind: "you", text: ["you apply · add the ownership check in orders.ts", "wdrażasz · sprawdzenie właściciela w orders.ts"] },
      { kind: "you", text: ["you apply · lodash 4.17.20 → 4.17.21", "wdrażasz · lodash 4.17.20 → 4.17.21"] },
    ],
  },
  {
    id: "verify", icon: ShieldCheck, label: ["Verify", "Weryfikacja"],
    caption: ["The same checks run again. A fix counts only when it is observed, and you get an updated report to keep.", "Te same kontrole uruchamiają się ponownie. Poprawka liczy się dopiero wtedy, gdy została zaobserwowana, a Ty dostajesz zaktualizowany raport."],
    rows: [
      { kind: "cmd", text: ["node tools/cda.mjs retest --scope audit --before before --after after", "node tools/cda.mjs retest --scope audit --before before --after after"] },
      { kind: "ok", text: ["confirmed_fixed ×3 · still_present 0", "confirmed_fixed ×3 · still_present 0"] },
      { kind: "ok", text: ["audit-report-after.pdf", "audit-report-after.pdf"] },
    ],
  },
];
const layers: [string, string][] = [["Database", "Baza danych"], ["Code", "Kod"], ["Dependencies", "Zależności"], ["Website", "Strona WWW"]];
// Which node on which layer carries a finding; purely illustrative.
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
    const update = () => setAuto(visible && !query.matches && document.documentElement.dataset.motion === "running");
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.3 });
    observer.observe(el);
    const mutation = new MutationObserver(update);
    mutation.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    query.addEventListener("change", update);
    return () => { observer.disconnect(); mutation.disconnect(); query.removeEventListener("change", update); };
  }, []);
  useEffect(() => {
    if (!auto || held) return;
    const id = setTimeout(() => setStage((value) => (value + 1) % stages.length), 4200);
    return () => clearTimeout(id);
  }, [auto, held, stage]);

  const current = stages[stage];
  return (
    <section className="theater-section section-shell" id="scan" aria-labelledby="theater-title">
      <div className="section-heading" data-reveal>
        <div>
          <span className="eyebrow">{pl ? "JAK DZIAŁA SKILL" : "HOW THE SKILL WORKS"}</span>
          <h2 id="theater-title">
            {pl ? "Skanuje. Wykrywa. Raportuje." : "Scan. Detect. Report."}
            <br />
            <span className="gradient-text">{pl ? "Ty naprawiasz, on sprawdza." : "You fix, it verifies."}</span>
          </h2>
        </div>
        <p>
          {pl
            ? "Pięć kroków każdego audytu. Kliknij krok albo patrz, jak sekwencja biegnie sama. Dane w pokazie są przykładowe."
            : "The five steps of every audit. Click a step or watch the sequence run. The data shown is sample data."}
        </p>
      </div>
      <div className="theater" ref={region} data-stage={current.id} data-agent-target="Scout" data-agent-label={pl ? "Uruchamianie audytu" : "Running the audit"}>
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
        <div className="theater-body">
          <div className="scene" aria-hidden="true">
            <span className="demo-tag">{pl ? "WIZUALIZACJA / DEMO" : "VISUALISATION / DEMO"}</span>
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
              <ShieldCheck size={30} strokeWidth={1.4} />
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
