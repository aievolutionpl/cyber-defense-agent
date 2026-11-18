import { ArrowUpRight, Check, Download, LayoutDashboard } from "lucide-react";
import { asset, github, type Locale } from "@/lib/config";

export function ReportShowcase({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const points = pl
    ? ["Werdykt i wykres priorytetów na pierwszej stronie", "Trzy rzeczy, od których warto zacząć", "Każde ustalenie: co grozi, dowód, poprawka, sposób sprawdzenia", "Pomysły, co warto ulepszyć i dopracować", "Uczciwe pokrycie: co sprawdzono, a czego nie"]
    : ["The verdict and a priority chart on page one", "The three things to start with", "Every finding: impact, evidence, fix, how to verify", "Ideas for what is worth improving", "Honest coverage: what was checked and what was not"];
  const tiles: [string, string, string][] = pl
    ? [["10", "otwarte ustalenia", "p0"], ["3", "potwierdzone poprawki", "ok"], ["842", "sprawdzone paczki", ""], ["2", "pomysły", "idea"]]
    : [["10", "open findings", "p0"], ["3", "confirmed fixes", "ok"], ["842", "packages checked", ""], ["2", "ideas", "idea"]];
  const bars: [string, number][] = pl ? [["Strona WWW", 100], ["Zależności", 60], ["Kod", 22], ["Baza danych", 22]] : [["Website", 100], ["Dependencies", 60], ["Code", 22], ["Database", 22]];
  const rows: [string, string][] = pl
    ? [["P0", "Tabela zamówień czytelna dla każdego"], ["P1", "Podgląd zamówienia ufa ID z adresu"], ["P1", "lodash 4.17.20 · CVE-2021-23337"], ["P2", "Ciasteczko sesji bez HttpOnly"]]
    : [["P0", "Orders table readable by anyone"], ["P1", "Order lookup trusts the ID in the URL"], ["P1", "lodash 4.17.20 · CVE-2021-23337"], ["P2", "Session cookie without HttpOnly"]];
  return (
    <section data-build-section className="deliver-section section-shell" id="report" aria-labelledby="deliver-title">
      <div className="section-heading" data-reveal>
        <div>
          <span className="eyebrow">{pl ? "04 / CO DOSTAJESZ" : "04 / WHAT YOU GET"}</span>
          <h2 id="deliver-title">
            {pl ? "Najważniejsze decyzje." : "The decisions that matter."}
            <br />
            <span className="gradient-text">{pl ? "Dowody w jednym raporcie." : "Evidence in one report."}</span>
          </h2>
        </div>
        <p>
          {pl
            ? "Przed zmianami dostajesz lokalny raport HTML z priorytetami i dowodami. PDF zapiszesz przez przeglądarkę lub po osobnej zgodzie na jej uruchomienie."
            : "Before changes, you receive a local HTML report with priorities and evidence. Save a PDF through your browser, or give separate permission for automated printing."}
        </p>
      </div>
      <div className="deliver-grid">
        <div className="pdf-stage" data-reveal data-agent-target="Verifier" data-agent-label={pl ? "Składanie raportu PDF" : "Assembling the PDF report"}>
          <div className="pdf-stack">
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, pre-sized local asset */}
            <img className="pdf-page pdf-back" src={asset("/assets/report-page-2.webp")} alt="" width={909} height={1287} loading="lazy" />
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, pre-sized local asset */}
            <img
              className="pdf-page pdf-front"
              src={asset("/assets/report-page-1.webp")}
              width={909}
              height={1287}
              loading="lazy"
              alt={pl ? "Pierwsza strona przykładowego raportu PDF: werdykt „Działaj dziś”, wykres priorytetów, trzy najważniejsze rzeczy i rozkład ryzyka." : "First page of the sample PDF report: the verdict “Act today”, a priority chart, the three things that matter most and the risk breakdown."}
            />
          </div>
          <div className="pdf-actions">
            <a className="button button-primary" href={asset(pl ? "/assets/sample-audit-report-pl.pdf" : "/assets/sample-audit-report.pdf")}>
              <Download size={17} aria-hidden="true" />
              <span>{pl ? "Otwórz przykładowy PDF" : "Open the sample PDF"}</span>
            </a>
            <span className="mono">{pl ? "5 stron · dane przykładowe" : "5 pages · sample data"}</span>
          </div>
        </div>
        <div className="deliver-side">
          <ul className="deliver-points" data-reveal>
            {points.map((text) => (
              <li key={text}><Check size={15} aria-hidden="true" />{text}</li>
            ))}
          </ul>
          <div className="dash-mock" data-reveal data-agent-target="Builder" data-agent-label={pl ? "Budowanie panelu" : "Building the dashboard"} role="img" aria-label={pl ? "Przykładowy panel: 10 otwartych ustaleń, 3 potwierdzone poprawki, 842 sprawdzone paczki, 2 pomysły; lista ustaleń według priorytetu." : "Sample dashboard: 10 open findings, 3 confirmed fixes, 842 packages checked, 2 ideas; findings listed by priority."}>
            <div className="dash-bar">
              <span className="dash-live"><LayoutDashboard size={14} aria-hidden="true" />dashboard.html</span>
              <span className="mono">{pl ? "przykład · dane syntetyczne" : "example · synthetic data"}</span>
            </div>
            <div className="dash-tiles">
              {tiles.map(([value, label, tone]) => (
                <div key={label} data-tone={tone}>
                  <b>{value}</b>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="dash-mid">
              <svg viewBox="0 0 140 140" className="dash-donut" aria-hidden="true">
                <circle cx="70" cy="70" r="52" className="d-track" />
                <circle cx="70" cy="70" r="52" className="d-arc d-p2" pathLength="100" strokeDasharray="100 100" />
                <circle cx="70" cy="70" r="52" className="d-arc d-p1" pathLength="100" strokeDasharray="50 100" />
                <circle cx="70" cy="70" r="52" className="d-arc d-p0" pathLength="100" strokeDasharray="10 100" />
                <text x="70" y="76" textAnchor="middle">10</text>
              </svg>
              <div className="dash-bars">
                {bars.map(([label, width], n) => (
                  <div key={label} style={{ "--w": `${width}%`, "--n": n } as React.CSSProperties}>
                    <span>{label}</span>
                    <i />
                  </div>
                ))}
              </div>
            </div>
            <ul className="dash-rows">
              {rows.map(([priority, text], n) => (
                <li key={text} style={{ "--n": n } as React.CSSProperties}>
                  <span className={`prio prio-${priority.toLowerCase()}`}>{priority}</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <a className="subtle-link" href={github("/blob/main/docs/EXPERT_CAPABILITIES.md")}>
            {pl ? "Jak powstaje raport i panel" : "How the report and dashboard are made"}
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
