import type { Locale } from "./config";

/** Stable option indexes keep routing independent of translated button labels. */
export function onboardingPlan(locale: Locale, answers: number[]): string[] {
  const pl = locale === "pl";
  const [goal, priority, files] = answers;
  if (goal === 2)
    return pl
      ? [
          "Przygotuj architekturę izolowanego labu.",
          "Ustal hosty, porty, konta testowe i warunek STOP.",
          "Omów konfigurację. Aktywne testy są w roadmapie.",
        ]
      : [
          "Plan an isolated lab architecture.",
          "Define hosts, ports, test accounts and a STOP condition.",
          "Review configuration. Active tests stay on the roadmap.",
        ];
  const scope = files === 0 ? "package.json" : "package.json + SARIF";
  if (goal === 1 && files === 0)
    return pl
      ? [
          "Do importu potrzebny jest raport JSON / SARIF oraz wskazane przez niego pliki.",
          "Wybrano tylko package.json: zmień odpowiedź, aby uwzględnić raport.",
          "Nie rozszerzaj zakresu automatycznie. Bez raportu import nie jest możliwy.",
        ]
      : [
          "Import needs a JSON / SARIF report and its referenced source files.",
          "Only package.json was selected: change your answer to include the report.",
          "Do not expand scope automatically. Import cannot proceed without the report.",
        ];
  return pl
    ? [
        `Zaproponuj zakres: ${scope}.`,
        "Zaczekaj na jawne zatwierdzenie odczytu w CLI.",
        priority === 2
          ? "Porównaj wyniki i zaznacz luki w dowodach."
          : "Przejrzyj wyniki, poprawkę i pokrycie retestu.",
      ]
    : [
        `Propose the scope: ${scope}.`,
        "Wait for explicit read approval in the CLI.",
        priority === 2
          ? "Compare results and identify gaps in the evidence."
          : "Review findings, remediation and retest coverage.",
      ];
}
