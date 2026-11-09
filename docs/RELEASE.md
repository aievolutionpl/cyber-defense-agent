# Wersja porównawcza Node v0.1

Stan: opublikowana. GitHub Pages build zakończony sukcesem, URL HTTP 200; 27/27 kontroli w publicznym Chromium, brak błędów i ostrzeżeń konsoli.

- Strona: https://aievolutionpl.github.io/cyber-defense-agent/compare/node-v0.1/
- Pełny kod: https://github.com/aievolutionpl/cyber-defense-agent/tree/codex/node-v0.1
- Repozytorium: https://github.com/aievolutionpl/cyber-defense-agent
- Artefakty strony: gałąź codex/node-v01-preview, wyłącznie katalog compare/node-v0.1.
- CI Node 22 / Linux: https://github.com/aievolutionpl/cyber-defense-agent/actions/runs/42682757047 — sukces.
- Build Pages: https://github.com/aievolutionpl/cyber-defense-agent/actions/runs/42683553335

Ta wersja jest przeznaczona do porównania. Nie publikuje własnego landingu pod adresem głównym GitHub Pages. Strona główna i gałąź main należą do drugiej implementacji. Przy utworzeniu pustego repo GitHub automatycznie ustawił pierwszą wypchniętą gałąź jako domyślną; docelowo main należy ustawić po pojawieniu się drugiej wersji. Nie utworzono i nie nadpisano plików main.

GitHub Pages nie było wcześniej skonfigurowane. Publikacja używa gałęzi codex/node-v01-preview i pliku .nojekyll. Jeśli główna implementacja w przyszłości użyje tego samego GitHub Pages, trzeba zachować katalog compare/node-v0.1 w jej artefakcie albo przenieść porównanie na osobny hosting. Nie nadpisuj folderu tej wersji przy zmianie publikacji.

## Odtworzenie builda

```powershell
$env:SITE_BASE_PATH='/cyber-defense-agent/compare/node-v0.1'
$env:NEXT_PUBLIC_SITE_URL='https://aievolutionpl.github.io/cyber-defense-agent/compare/node-v0.1/'
npm ci
npm run build
```

Wynik apps/site/out skopiuj do compare/node-v0.1 w gałęzi publikacyjnej, zachowując inne istniejące katalogi. Nie zapisuj .cda, .env ani lokalnych logów do artefaktu.

Do lokalnej wersji na / uruchom build bez tych zmiennych lub npm run dev. Strona zawiera samohostowane fonty; wymagane noty licencyjne są w THIRD_PARTY_LICENSES.txt w eksporcie.

Vercel nie utworzył podglądu: konektor był niedostępny, a endpoint dawnej metody bez logowania zwrócił informację o przejściu na CLI. Nie zmieniano konta, DNS ani domen Vercel i nie tworzono płatnych zasobów. Zamiast tego użyto GitHub Pages.

Pełna tabela możliwości i ograniczeń: [VERIFICATION.md](VERIFICATION.md). Integracje z Codex i Claude Code pozostają jawnie niezweryfikowane; lokalne narzędzia, demo i CI są sprawdzone.
