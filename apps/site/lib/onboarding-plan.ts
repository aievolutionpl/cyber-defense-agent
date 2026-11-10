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
  if (goal === 3)
    return pl
      ? [
          "Za Twoją zgodą: lista programów i otwartych portów, tylko odczyt, bez nazwy komputera.",
          files === 1
            ? "Za osobną zgodą: nazwy i wersje pakietów do OSV.dev, plus lista luk wykorzystywanych w atakach."
            : "Nic nie opuszcza komputera. Luki zbadamy ręcznie, zaczynając od najbardziej ryzykownych programów.",
          "Plan aktualizacji: co najpierw, skąd i jak cofnąć. Wdrażasz Ty, potem retest.",
        ]
      : [
          "With your consent: a read-only list of programs and open ports, without the computer name.",
          files === 1
            ? "With separate consent: package names and versions to OSV.dev, plus the exploited-in-the-wild list."
            : "Nothing leaves the machine. We research vulnerabilities by hand, riskiest software first.",
          "An update plan: what first, from where, how to undo. You apply it, then we retest.",
        ];
  if (goal === 4)
    return files === 1
      ? pl
        ? [
            "Stop. Sprawdzam tylko strony, które należą do Ciebie lub którymi administrujesz.",
            "Mogę za to wyjaśnić, jak właściciel strony może ją sprawdzić samodzielnie.",
            "Bez zgody właściciela nie wysyłam żadnego zapytania.",
          ]
        : [
            "Stop. I only check sites you own or administer.",
            "I can explain how the site's owner could check it themselves.",
            "Without the owner's consent I send no request.",
          ]
      : pl
        ? [
            "Potwierdź dokładny adres. Wyślę kilka zwykłych zapytań GET, jak przeglądarka.",
            "Sprawdzę HTTPS, HSTS, CSP, ciasteczka, CORS i certyfikat. Bez logowania i ruchu atakującego.",
            "Dostaniesz gotowe wartości nagłówków. Po zmianie powtarzam test.",
          ]
        : [
            "Confirm the exact address. I send a few ordinary GET requests, like a browser.",
            "I check HTTPS, HSTS, CSP, cookies, CORS and the certificate. No logins, no attack traffic.",
            "You get ready-to-paste header values. After your change I repeat the check.",
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
