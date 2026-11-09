# Odbiór v0.1 Node — 2026-11-09

Wariant porównawczy na gałęzi `codex/node-v0.1`. Główna wersja produktu jest prowadzona osobno. Katalog roboczy tej wersji: projects/cyber-defense-agent-release.

## Narzędzia i kod

| Kontrola | Wynik |
|---|---|
| npm run check:skills | PASS: oba cienkie punkty wejścia wskazują jeden kanoniczny SKILL.md |
| npm test | PASS: 25 testów; 0 błędów, 0 pominiętych na Windows |
| npm run lint | PASS: 0 ostrzeżeń |
| npm run typecheck | PASS |
| npm run build | PASS: statyczny eksport Next.js 16.4.5 |
| npm audit | 0 podatności produkcyjnych i developerskich na dzień kontroli |
| node tools/demo.mjs | PASS: import SARIF, lokalny dowód, poprawka kopii, potwierdzony retest, brak danych i blokada poza zakresem |
| CLI review → retest + niedozwolony import | PASS: confirmed_fixed, INVALID_PATH i brak pliku wynikowego po odmowie |

Testy obejmują: zgodę i wygaśnięcie, mutację i cofnięcie zakresu, allowlistę, traversal/UNC/URL/NTFS, symlinki, junctiony Windows, hardlinki, podmianę ścieżki, binarne/duże pliki, bezpieczny stan, redakcję, prompt injection w imporcie, schematy i lokalizacje SARIF, brak pokrycia, nieaktualny/deletowany plik, obcy root oraz brak wykonania skryptu badanego projektu.

Node: 26.12.1 lokalnie; wymagane >=22. CI przygotowane na Node 22. Narzędzia CLI nie mają zewnętrznych zależności. Niesprawdzane jeszcze systemy: macOS; Linux wymaga wyniku CI.

Zależności lintowania są scentralizowane w katalogu głównym. Override minimatch >=7,<11.0.1 → 11.0.5 usuwa GHSA-g3hv-75wg-m249 w łańcuchu typescript-eslint; lint i build zostały ponownie sprawdzone. minimatch 3 z osobnego łańcucha nie jest objęty tym advisory. Nie użyto automatycznego downgrade Next.js.

## Strona w Chromium

27 kontroli interakcyjnych: zakładki hero, strzałki klawiatury, dowód, retest, wymagana zgoda w demo, odmowa poza zakresem, kolejność dowodu, pełny retest, niepełny raport, restart, cztery warianty kopiowania, zakładki instalacji, FAQ z klawiatury, kotwice, wspólne linki repo, brak przewijania poziomego przy 320/375/390/768/1280 px, menu mobilne i reduced-motion.

Desktop: 1440×1000. Mobile: 390×844. Wykonano rzeczywisty przegląd zrzutów desktop/hero/mobile/demo, następnie zwiększono czytelność tekstów i odróżniono ikonę braku danych od poprawki.

Reprodukcja (po npm run build, przy lokalnym serwerze na porcie 3107):

```sh
npx --yes serve apps/site/out --listen tcp://127.0.0.1:3107 --no-clipboard
npx --yes --package @playwright/cli playwright-cli --session cda-node open http://127.0.0.1:3107
npx --yes --package @playwright/cli playwright-cli --session cda-node run-code --filename scripts/ui-acceptance.js
```

Wygenerowane zrzuty i logi są w lokalnym output/playwright/ (wyłączone z Gita). W końcowym przebiegu: 27/27, konsola 0 błędów i 0 ostrzeżeń. Pierwszy serwer Python na Windows resetował równoległe połączenia z plikami JS. Po zmianie na statyczny serwer Node i dodaniu oczekiwania na widoczne stany paneli cały scenariusz przeszedł bez błędów. Jeśli port jest zajęty, serve wybiera inny; otwórz zwrócony adres (test używa bieżącego origin). Nie testowano na fizycznym telefonie ani w Safari/Firefox. Kontrole klawiatury nie są pełnym audytem WCAG.

## Codex i Claude Code

| Integracja | Stan | Dowód / ograniczenie |
|---|---|---|
| Punkty wejścia skilla | Sprawdzone statycznie | Oba wskazują skills/cyber-defense/SKILL.md |
| Codex CLI 0.163.0 | **NIEZWERYFIKOWANA end-to-end** | Zalogowany; powłoka nie uruchamia się: registered Core launch requires an installed app. Skilla i demo nie uruchomiono w tym hoście. |
| Claude Code 2.1.314 | **NIEZWERYFIKOWANA end-to-end** | Uruchomiony test /cyber-defense demo; dostawca zwrócił HTTP 429 usage_limit_reached (limit tygodniowy), 0 tokenów API. |
| GitHub CLI | Działa | Autoryzowany dostęp do rzeczywistego publicznego repo |
| Konektory GitHub / Exa / Vercel w sesji | Niedostępne | MCP tool is not available to the model; użyto GitHub CLI, źródeł oficjalnych i osobnego deployu preview |
| Semgrep / Gitleaks / Trivy / Nuclei / Nmap | Brak integracji wykonawczej w v0.1 | Research i przyszłe adaptery; niczego nie instalowano i nie uruchamiano |

Lokalne dowody prób hostów: output/integrations/ (niepublikowane). Sukces CLI i testów nie jest przedstawiany jako sukces integracji z modelem.

## Publikacja

Adres repo: https://github.com/aievolutionpl/cyber-defense-agent

Kod wariantu: https://github.com/aievolutionpl/cyber-defense-agent/tree/codex/node-v0.1

Strona tej wersji będzie osobnym publicznym podglądem. Nie konfiguruje GitHub Pages ani nie zmienia wdrożenia głównej wersji. Szczegóły końcowego podglądu są zapisane w docs/RELEASE.md.
