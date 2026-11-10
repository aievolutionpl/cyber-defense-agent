import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { asset, github, type Locale } from "@/lib/config";

export function Policies({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const sections = pl
    ? [
        [
          "Dla doświadczonych operatorów",
          "Skill pomaga prowadzić uporządkowany przegląd bezpieczeństwa. Nie nadaje certyfikacji eksperckiej i nie gwarantuje wykrycia podatności. Używaj go tylko, jeśli rozumiesz uprawnienia, sandbox i przepływ danych swojego hosta agenta. Zacznij od syntetycznego demo.",
        ],
        [
          "Twoja odpowiedzialność",
          "Analizuj wyłącznie zasoby, do których masz upoważnienie. Odpowiadasz za zakres, ujawniane dane i wdrażane zmiany. Sprawdzaj wyniki i poprawki. Oprogramowanie jest udostępnione „tak jak jest”, bez gwarancji, na licencji MIT, w granicach dopuszczonych prawem. Nie ogranicza to praw, których nie można prawnie wyłączyć.",
        ],
        [
          "Prywatność strony",
          "To statyczna prezentacja na fikcyjnych danych. Nie ma kont, uploadu kodu, płatności, analityki, reklam ani połączenia z modelem. Fonty, obrazy i film są hostowane razem ze stroną. Wybory demo są przechowywane tylko w pamięci strony i znikają po jej odświeżeniu.",
        ],
        [
          "Cookies i pamięć przeglądarki",
          "Aplikacja nie ustawia cookies i nie używa localStorage, sessionStorage, IndexedDB ani fingerprintingu. Język wynika z adresu URL. Preferencja ograniczenia ruchu pochodzi z przeglądarki lub systemu; pauza działa tylko w bieżącej stronie. Kopiowanie zapisuje wybrane polecenie w schowku po kliknięciu i nie odczytuje schowka. Ponieważ nie ma opcjonalnego śledzenia, nie pokazujemy pozornego banera zgody.",
        ],
        [
          "Hosting i zewnętrzne linki",
          "GitHub Pages otrzymuje zwykłe żądania HTTP, w tym adres IP i informacje przeglądarki. Infrastruktura hostingu oraz przeglądarka mogą utrzymywać logi lub cache zgodnie z własnymi zasadami. Nie kontrolujemy retencji GitHuba. Przejście do zewnętrznego linku wysyła żądanie do danego serwisu.",
        ],
        [
          "Lokalne narzędzia i dostawcy AI",
          "CLI odczytuje zatwierdzone pliki i zapisuje raporty w prywatnym katalogu .cda/. Nie wywołuje modelu. Trzy polecenia wykraczają poza zatwierdzone pliki i każde wymaga jawnej flagi po Twojej decyzji: inventory wypisuje programy i nasłuchujące porty komputera (bez nazwy komputera, użytkownika i ścieżek); advisories wysyła do OSV.dev nazwy i wersje pakietów oraz pobiera publiczną listę CISA KEV; web wysyła kilka zapytań GET do wskazanej przez Ciebie strony. Lista oprogramowania też może być poufna. Terminalowy onboarding nie zapisuje odpowiedzi. Host agenta może jednak przekazać prompty i wyniki narzędzi dostawcy modelu. Przejrzyj raport lokalnie przed udostępnieniem. Redakcja nie wykrywa wszystkich sekretów; ścieżki też mogą być poufne.",
        ],
        [
          "Retencja i zgłoszenia",
          "Ty zarządzasz lokalnymi raportami. Cofnięcie zakresu nie usuwa danych. Po weryfikacji ścieżek usuń niepotrzebny stan .cda/ i tymczasową kopię demo. Nie publikuj prywatnych raportów ani sekretów w issues. Dla wrażliwych zgłoszeń stosuj SECURITY.md.",
        ],
        [
          "Przejrzystość i ograniczenia",
          "Kod, instrukcje, testy i konfiguracja są publiczne. Nie oznacza to niezależnego audytu ani gwarancji braku błędów. v0.2 ma cztery lokalne reguły, import raportów, inwentarz oprogramowania, sprawdzanie znanych luk, pasywną kontrolę strony i ostrożny retest. Aktywne testy sieci, automatyczne naprawy i konektory usług pozostają w roadmapie.",
        ],
      ]
    : [
        [
          "For experienced operators",
          "This skill helps an AI coding agent follow a structured security review. It does not certify expertise or guarantee vulnerability detection. Use it only if you understand your host’s permissions, sandbox and data flow. Start with the synthetic demo.",
        ],
        [
          "Your responsibility",
          "Inspect only resources you own or are authorized to assess. You are responsible for scope, disclosed data and applied changes. Review findings and fixes. The software is provided as is, without warranty, under the MIT license to the extent permitted by law. This does not exclude rights that cannot legally be waived.",
        ],
        [
          "Website privacy",
          "This is a static presentation with synthetic data. There are no accounts, code uploads, payments, analytics, advertising or model connections. Fonts, images and video are served with the site. Demo choices exist in page memory and reset on reload.",
        ],
        [
          "Cookies and browser storage",
          "The application sets no cookies and uses no localStorage, sessionStorage, IndexedDB or fingerprinting. Language comes from the URL. Reduced-motion preferences come from your browser or OS; pause is held in page memory. Copy buttons write the selected command to your clipboard only when clicked and do not read it. With no optional tracking, we show this policy instead of a misleading consent banner.",
        ],
        [
          "Hosting and external links",
          "GitHub Pages receives ordinary HTTP requests, including IP address and browser information. Hosting infrastructure and your browser may retain logs or cached assets under their own policies. We do not control GitHub’s retention. Following an external link sends a request to that service.",
        ],
        [
          "Local tools and AI providers",
          "The CLI reads approved files and writes private .cda/ reports. It calls no model. Three commands go beyond approved files and each needs an explicit flag after your decision: inventory lists the programs and listening ports of the machine (no computer name, user name or paths); advisories sends package names and versions to OSV.dev and downloads the public CISA KEV list; web sends a few GET requests to the site you name. A software list can itself be sensitive. Terminal intake answers are not saved. Your agent host may still send prompts and tool output to its model provider. Inspect reports locally before sharing. Redaction cannot detect every secret; paths may also be sensitive.",
        ],
        [
          "Retention and reporting",
          "You control local retention. Revoking a scope does not delete existing reports. After verifying paths, remove unneeded .cda/ state and the demo’s temporary copy. Never publish private findings or secrets in issues. Follow SECURITY.md for sensitive reports.",
        ],
        [
          "Transparency and limits",
          "Source, instructions, tests and configuration are public. This does not establish an independent audit or guarantee an absence of defects. v0.2 ships four local rules, report import, software inventory, known-vulnerability lookup, a passive website check and conservative retesting. Active network tests, automatic remediation and service connectors remain on the roadmap.",
        ],
      ];
  return (
    <main className="policy-page section-shell">
      <a className="subtle-link" href={asset(pl ? "/" : "/en/")}>
        <ArrowLeft size={16} />
        {pl ? "Wróć do prezentacji" : "Back to the presentation"}
      </a>
      <header>
        <span className="eyebrow">CYBER DEFENSE AGENT / 9 NOV 2026</span>
        <h1>
          {pl
            ? "Prywatność. Odpowiedzialność. Kontrola."
            : "Privacy. Responsibility. Control."}
        </h1>
        <p>
          {pl
            ? "Jasne zasady przed pierwszym audytem."
            : "Clear boundaries before your first audit."}
        </p>
      </header>
      <div className="policy-sections">
        {sections.map(([title, text], i) => (
          <section key={title}>
            <span className="mono">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </section>
        ))}
      </div>
      <nav aria-label={pl ? "Dokumentacja zasad" : "Policy references"}>
        <a href={github("/blob/main/PRIVACY.md")}>
          Privacy & cookies
          <ArrowUpRight size={14} />
        </a>
        <a href={github("/blob/main/docs/RESPONSIBLE_USE.md")}>
          Responsible use
          <ArrowUpRight size={14} />
        </a>
        <a href={github("/blob/main/SECURITY.md")}>
          Security
          <ArrowUpRight size={14} />
        </a>
        <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">
          GitHub privacy
          <ArrowUpRight size={14} />
        </a>
      </nav>
    </main>
  );
}
