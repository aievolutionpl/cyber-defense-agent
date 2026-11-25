"use client";

import { useState } from "react";
import { ArrowUpRight, FileText, Layers } from "lucide-react";
import { type Locale } from "@/lib/config";
import { samplePdf, sampleReport } from "@/lib/sample-report";
import { HeroSignal } from "./hero-signal";

export function SampleReportViewer({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const [simulation, setSimulation] = useState(false);
  return (
    <div className="sample-viewer">
      <div className="preview-switch" role="group" aria-label={pl ? "Widok przykładu" : "Example view"}>
        <button type="button" aria-pressed={!simulation} onClick={() => setSimulation(false)}>
          <FileText size={16} />{pl ? "Raport" : "Report"}
        </button>
        <button type="button" aria-pressed={simulation} onClick={() => setSimulation(true)}>
          <Layers size={16} />{pl ? "Przebieg przeglądu" : "Review walkthrough"}
        </button>
      </div>
      {simulation ? <HeroSignal locale={locale} /> : (
        <article className="report-sheet">
          <header className="sheet-meta"><span>CYBER DEFENSE</span><span>{pl ? "DANE PRZYKŁADOWE" : "SAMPLE DATA"}</span></header>
          <h2>{pl ? "Przegląd sklepu" : "Storefront review"}</h2>
          <p className="sheet-domain">{pl ? "sklep.example" : "shop.example"}</p>
          <div className="sheet-summary">
            <strong>{sampleReport.open}</strong><span>{pl ? "otwartych ustaleń" : "open findings"}</span>
          </div>
          <div className="sheet-priorities">
            {sampleReport.priorities.map(({ priority, count }) => (
              <div key={priority} style={{ flexGrow: count }}>
                <i data-priority={priority} /><span>{priority} · {count}</span>
              </div>
            ))}
          </div>
          <div className="sheet-finding">
            <span>P0</span><div><strong>{pl ? "Dostęp do zamówień" : "Access to customer orders"}</strong>
            <p>{pl ? "Ocena modelu wskazuje na wyłączone zabezpieczenia na poziomie wierszy w tabeli zamówień." : "The model review flags disabled row-level security on the orders table."}</p></div>
          </div>
          <footer><span>PDF · {sampleReport.pages} {pl ? "stron" : "pages"}</span>
            <a href={samplePdf(locale)}>{pl ? "Czytaj raport" : "Read report"}<ArrowUpRight size={16} /></a>
          </footer>
        </article>
      )}
    </div>
  );
}
