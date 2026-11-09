# Cyber Defense Agent · v0.1

Sprawdź bezpieczeństwo swojej firmy z agentem AI. Lokalny przegląd plików, analiza raportów i retest w **Codex** lub **Claude Code**.

> Ta gałąź `codex/node-v0.1` jest wersją porównawczą z narzędziami Node.js. Wersja główna powstaje niezależnie na main. Nie uruchamiaj narzędzi z niezaufanej kopii badanego projektu.

[Repozytorium tej wersji](https://github.com/aievolutionpl/cyber-defense-agent/tree/codex/node-v0.1) · [Przykładowy raport](examples/sample-audit.md) · [Bezpieczeństwo](SECURITY.md) · [Baza wiedzy i research](docs/RESEARCH.md)

## Dostępne funkcje

- Jawna, dokładna lista plików, osobne zatwierdzenie i wygaśnięcie zakresu po 24 h.
- Lokalny odczyt bez wykonywania kodu, instalowania zależności i połączeń sieciowych.
- Cztery proste reguły: znany advisory lodash, wyłączona weryfikacja TLS, możliwy sekret i eval. To nie jest pełny SAST ani aktualizowana baza CVE.
- Import **cda.scan.v1 JSON** i **SARIF 2.1.0** z relatywnymi lokalizacjami w zakresie; deduplikacja wyniku.
- Markdown z lokalizacją, zredagowanym dowodem, priorytetem, pewnością i poprawką.
- Retest: `confirmed_fixed`, `still_present`, `insufficient_data` i nowe ustalenia. Sama nieobecność wpisu w imporcie nie potwierdza poprawki.
- Polska statyczna strona Next.js z interaktywnym demo. Nie przyjmuje kodu, domen ani poświadczeń.

Audyty web/API/sieci, pełne skanery zewnętrzne, automatyczne poprawki i chmura są [w planie](docs/ROADMAP.md).

## Szybki start bez modelu

Wymagania: Node.js 22+ i Git. Nie potrzeba npm install do narzędzi CLI.

```sh
git clone --branch codex/node-v0.1 https://github.com/aievolutionpl/cyber-defense-agent.git
cd cyber-defense-agent
node tools/demo.mjs
```

Demo kopiuje znane pliki do nowego katalogu tymczasowego i zmienia tylko tę kopię. Nie instaluje ani nie uruchamia kodu fixture. Wyniki:

- `.cda/reports/demo-before.md` — lokalny sygnał lodash 4.17.20, reguła CDA-DEP-001.
- `.cda/reports/demo-import.md` — znormalizowany SARIF bez surowej treści.
- `.cda/reports/demo-retest.md` — potwierdzenie lokalną regułą po zmianie kopii do 4.17.21.
- `.cda/reports/demo-no-data.md` — niepełny drugi import: brak potwierdzenia.
- Próba `../private/.env` zostaje zablokowana.

Kopia tymczasowa zostaje na komputerze, aby można ją było obejrzeć. Zawiera tylko dane demonstracyjne. Raporty i zakresy są wyłączone z Gita.

## Codex

Zainstaluj i zaloguj Codex zgodnie z [dokumentacją](https://developers.openai.com/codex/quickstart). Otwórz sklonowane repo w aplikacji Codex lub uruchom z jego katalogu:

```sh
codex
```

W czacie:

```text
$cyber-defense demo
```

Punkt wejścia: [.agents/skills/cyber-defense/SKILL.md](.agents/skills/cyber-defense/SKILL.md). Odczytuje wspólny [skills/cyber-defense/SKILL.md](skills/cyber-defense/SKILL.md). Nie trzeba instalować skilla globalnie. Jawne wywołanie jest wymagane; nie włącza się automatycznie.

## Claude Code

Zainstaluj i zaloguj Claude Code zgodnie z [dokumentacją](https://code.claude.com/docs/en/quickstart). W katalogu głównym sklonowanego repo:

```sh
claude
```

W czacie:

```text
/cyber-defense demo
```

Punkt wejścia: [.claude/skills/cyber-defense/SKILL.md](.claude/skills/cyber-defense/SKILL.md). Procedura jest tą samą instrukcją co w Codex. Polecenia wykonuj z katalogu głównego repo. Model i dostęp do niego są osobną usługą użytkownika.

## Pierwszy własny audyt

Używaj zaufanego repo agenta **oddzielnie od badanego projektu**. Wskaż dokładne pliki, do których masz prawo dostępu. Narzędzie nie przeszukuje katalogu, żeby zgadywać listę.

Przykład (z katalogu agenta; podmień /path/to/project na własną ścieżkę):

```sh
node tools/cda.mjs scope --root /path/to/project --allow package.json --allow src/config.ts --name audit
```

Przejrzyj kanoniczny katalog i listę. Dopiero po zatwierdzeniu:

```sh
node tools/cda.mjs approve --scope audit --root /path/to/project --yes
node tools/cda.mjs show --scope audit
node tools/cda.mjs review --scope audit --name before
```

Raport: `.cda/reports/before.md`. Narzędzie nie zmienia projektu. Gdy sam wprowadzisz poprawkę:

```sh
node tools/cda.mjs review --scope audit --name after
node tools/cda.mjs retest --scope audit --before before --after after --name retest
node tools/cda.mjs revoke --scope audit
```

Import wymaga uwzględnienia pliku raportu i wszystkich jego lokalizacji w zatwierdzonej liście. Przykład dla fixture:

```sh
node tools/cda.mjs scope --root examples/demo-repo --allow package.json --allow reports/before.sarif --name imported
node tools/cda.mjs approve --scope imported --root examples/demo-repo --yes
node tools/cda.mjs import --scope imported --input reports/before.sarif --name imported-before
```

Odmowa lub nieobsługiwany format nie upoważnia do odczytu innym narzędziem. [Formaty i reguły](docs/FORMATS.md).

## Dane i ograniczenia

| Warstwa | Przetwarzane dane | Sieć / model |
|---|---|---|
| CLI w tools/ | Tylko zatwierdzone pliki, metadane zakresu i lokalny stan .cda | Brak sieci, LLM SDK i telemetrii |
| Importer | JSON/SARIF i lokalizacje w zakresie | Nie pobiera URL-i; pomija surowy tekst, snippet, link i fix |
| Codex / Claude Code | Prompt, wyjście narzędzia i treści włączone do czatu | Mogą trafić do dostawcy modelu według ustawień hosta |
| Publiczna strona | Zasoby strony i statyczny scenariusz | Hosting obsługuje żądania strony; brak uploadów i analityki aplikacyjnej |

Przed przekazaniem prywatnego raportu modelowi **przejrzyj Markdown lokalnie**. Redakcja wzorców nie gwarantuje wykrycia każdego sekretu. Nazwy plików i reguł też mogą być poufne. Nie włączaj surowego raportu ani pełnych plików do kontekstu modelu.

CLI nie tworzy izolacji systemowej i nie ogranicza innych narzędzi hosta. Używaj nieruchomej kopii projektu bez równoległych zmian; dla wrogich projektów potrzebna jest dodatkowa izolacja OS. [Model zagrożeń](docs/THREAT_MODEL.md).

## Strona i rozwój

```sh
npm ci
npm run dev
# http://localhost:3107
npm run check
npm run demo
```

Strona: Next.js 16 / TypeScript / Tailwind 4. `npm run build` eksportuje do `apps/site/out/`. Można hostować sam statyczny eksport. `SITE_BASE_PATH` pozwala budować pod ścieżką; `NEXT_PUBLIC_SITE_URL` ustawia kanoniczny URL. Linki i polecenia mają jedno ustawienie: apps/site/lib/config.ts.

## Struktura

```text
apps/site/                      strona i statyczne demo
skills/cyber-defense/SKILL.md    jedyne źródło instrukcji
.agents/skills/cyber-defense/    cienki punkt wejścia Codex
.claude/skills/cyber-defense/    cienki punkt wejścia Claude Code
tools/                          lokalne narzędzia Node bez zależności
examples/                       fikcyjne pliki, SARIF i raporty
tests/                          testy granic bezpieczeństwa i retestu
docs/                           architektura, formaty, research, odbiór
```

[Wyniki weryfikacji](docs/VERIFICATION.md). Licencja własnego kodu: [MIT](LICENSE). Zewnętrzne projekty w researchu nie są automatycznie instalowane, dołączane ani objęte tą licencją.
