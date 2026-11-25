import { asset, type Locale } from "./config";

// Summary of the two localized PDFs shipped in public/assets.
export const sampleReport = {
  priorities: [
    { priority: "P0", count: 1 }, { priority: "P1", count: 2 },
    { priority: "P2", count: 5 }, { priority: "P3", count: 2 },
  ],
  open: 10, confirmed: 0, packages: 842, ideas: 2, pages: 5,
};

export const samplePdf = (locale: Locale) =>
  asset(locale === "pl" ? "/assets/sample-audit-report-pl.pdf" : "/assets/sample-audit-report.pdf");
