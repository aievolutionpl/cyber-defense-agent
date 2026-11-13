<p align="center">
  <img src="docs/assets/product-preview.png" alt="Cyber Defense Agent — polski skill bezpieczeństwa dla agentów AI od AI Evolution Polska" width="100%" />
</p>

<h1 align="center">🛡️ Cyber Defense Agent (v0.2)</h1>
<p align="center">
  <strong>Wiesz, co poprawić. Masz na to dowód.</strong><br/>
  Przegląd kodu, agentów AI i konfiguracji. Zatwierdzony zakres, konkretne dowody, plan naprawy i retest.<br/>
  <em>Polskie narzędzie open-source stworzone i rozwijane przez <a href="https://github.com/aievolutionpl"><strong>AI Evolution Polska</strong></a>.</em>
</p>

<p align="center">
  <a href="https://aievolutionpl.github.io/cyber-defense-agent/"><img src="docs/assets/explore.svg" alt="Otwórz interaktywną prezentację online" width="640" /></a>
</p>

<p align="center">
  🇵🇱 <strong>Polski (Domyślny)</strong> ·
  <a href="#english-documentation">🇬🇧 Read in English</a> ·
  <a href="#szybki-start-w-60-sekund">🚀 Szybki start</a> ·
  <a href="https://aievolutionpl.github.io/cyber-defense-agent/">🌐 Strona PL</a> ·
  <a href="https://aievolutionpl.github.io/cyber-defense-agent/en/">🌐 Website EN</a> ·
  <a href="examples/sample-audit-report-pl.pdf">📄 Przykładowy raport PDF (PL)</a>
</p>

---

## 💡 O co chodzi w 30 sekund?

Bezpieczeństwo zaczyna się od konkretnych pytań: kto ma dostęp do danych, jakie uprawnienia ma agent i co potwierdza, że poprawka działa.

**Cyber Defense Agent** łączy trzy elementy:

- **Skill** prowadzi agenta AI przez ustalenie zakresu, analizę dowodów i raport. Przegląd ekspercki jest oznaczony jako ocena modelu.
- **Lokalny CLI** zbiera wybrane dowody: osiem reguł analizy, zależności, import raportów, pasywna kontrola strony i retest. Wymaga Node.js 22+, bez zewnętrznych zależności npm.
- **Strona** pomaga wybrać jeden z siedmiu scenariuszy i skopiować brief do Codexa lub Claude Code. Nie uruchamia audytów ani nie przyjmuje plików.

Po przeglądzie otrzymujesz raport HTML z priorytetami, dowodami, ograniczeniami i planem naprawy. PDF wymaga zgody na uruchomienie lokalnej przeglądarki lub ręcznego zapisu przez Drukuj. Zmiany wymagają Twojej decyzji. Retest lokalnej reguły może potwierdzić naprawę; brak alertu w importowanym raporcie pozostaje niewystarczającym dowodem.

**Nowa ścieżka: agenci AI, skille i MCP.** [Playbook](skills/cyber-defense/references/knowledge/agent-security.md) pomaga ocenić uprawnienia narzędzi, granice zaufania, pamięć i przepływ danych. Korzysta ze źródeł OWASP Agentic 2026, ASVS 5.0.0 i MCP sprawdzonych 13 listopada 2026. To metoda przeglądu, nie automatyczny skaner MCP.

Lokalny CLI nie wywołuje modelu. Wybrany host AI może przekazywać treść rozmowy swojemu dostawcy i mieć własne opłaty. Zapytania do OSV i kontrola strony wymagają osobnych zgód.

---

## 🤝 Jeden skill. Każdy agent.

<p align="center">
  <img src="docs/assets/agents-bar-preview.png" alt="Jeden skill. Każdy agent — Codex, Claude Code, Cursor, Antigravity, Lovable, Hermes oraz obszary audytu" width="100%" />
</p>

Nie musisz instalować osobnych wtyczek do każdego edytora. Sklonuj repozytorium i otwórz je w swoim ulubionym narzędziu — punkty wejścia w katalogach `.agents/`, `.claude/` oraz `.hermes/` prowadzą do tej samej kanonicznej instrukcji [`skills/cyber-defense/SKILL.md`](skills/cyber-defense/SKILL.md):

| Twój Agent AI | Punkt wejścia w repozytorium | Jak uruchomić w czacie? | Status integracji |
|---|---|---|---|
| **OpenAI Codex** | `.agents/skills/cyber-defense/SKILL.md` | `$cyber-defense demo` | Wspólny punkt wejścia |
| **Claude Code** | `.claude/skills/cyber-defense/SKILL.md` | `/cyber-defense demo` | Wspólny punkt wejścia |
| **Cursor** | `.agents/skills/cyber-defense/SKILL.md` | Otwórz repo i poproś o audyt | Zgodny format skilla |
| **Google Antigravity** | `.agents/skills/cyber-defense/SKILL.md` | Otwórz repo i poproś o audyt | Zgodny format skilla |
| **Lovable** | `skills/cyber-defense/SKILL.md` | Przekazanie planu / instrukcji | Przekazanie planu |
| **Hermes** | `.hermes/skills/cyber-defense/SKILL.md` | Wczytaj `skills/cyber-defense/SKILL.md` | Eksperymentalny |

---

## 🎯 Co sprawdzi Twój agent? (7 scenariuszy)

Wskaż cel. Skill dobierze lokalne narzędzia lub metodę przeglądu eksperckiego i wyjaśni, jakiego dostępu potrzebuje:

| Co piszesz agentowi | Co robi Cyber Defense Agent | Jaki dowód otrzymujesz |
|---|---|---|
| **„Sprawdź mój komputer — co zaktualizować?”** | Wypisuje zainstalowane programy i otwarte porty (Windows, macOS, Linux), sprawdza luki w OSV.dev i CISA KEV, układa plan aktualizacji | `inventory` → `advisories` → raport z priorytetami `P0–P3` i bezpieczną kolejnością aktualizacji |
| **„Czy moja strona WWW jest bezpieczna?”** | Wykonuje ograniczoną liczbę zwykłych zapytań GET i kontrolę TLS: sprawdza HTTPS, HSTS, CSP, flagi cookies, CORS i certyfikat TLS | Raport `web` z gotowymi do wklejenia nagłówkami bezpieczeństwa |
| **„Przejrzyj mój projekt przed publikacją”** | Bada zależności z 6 formatów lockfile (`npm`, `PyPI`, `Cargo`, `Go`, `Composer`, `RubyGems`), wykrywa wycieki sekretów, błędy TLS, XSS, ukryty Unicode i importuje raporty `SARIF`/`JSON` | Raporty `deps`, `review`, `import`, komentarz PR (`pr-comment`) oraz weryfikacja `retest` |
| **„Sprawdź uprawnienia mojego agenta AI”** | Przegląda zatwierdzone skille, konfigurację MCP i kod kontroli uprawnień bez ich wykonywania | Mapa uprawnień, źródła ustaleń i oznaczona ocena ekspercka z [playbooka](skills/cyber-defense/references/knowledge/agent-security.md) |
| **„Sprawdź moją bazę danych w Supabase / Postgres”** | Weryfikuje ekspozycję w sieci, uprawnienia ról oraz luki w politykach Row-Level Security (RLS) zapytaniami tylko do odczytu (bez pobierania danych z wierszy) | Przegląd według playbooka `databases.md` (100% read-only) |
| **„Czy moja sieć domowa / firmowa jest OK?”** | Pokazuje usługi wystawione przez Twój komputer i prowadzi przez listę kontrolną routera (DNS, WPS, UPnP, przekierowania portów, separacja IoT/gości) | Wynik `inventory` + uporządkowana lista kontrolna `network.md` |
| **„Chyba miałem włamanie / wyciek klucza API”** | Prowadzi krok po kroku przez pierwsze 5 minut reakcji na incydent: jak odciąć dostęp i zabezpieczyć logi bez niszczenia dowodów | Playbook pierwszej pomocy `incident-first-response.md` |

---

## 🔍 Jak to działa w praktyce? (5 kroków i drabina zgód)

<p align="center">
  <img src="docs/assets/protection-preview.png" alt="Pięć kroków audytu: Skan, Wykrycie, Raport PDF, Poprawka i Weryfikacja" width="100%" />
</p>

**Drabina zgód (`L0–L5`)** rozdziela rodzaje dostępu. Nie trzeba przechodzić wszystkich poziomów. Istniejąca zgoda obowiązuje w zatwierdzonym zakresie; nowy zakres lub wysyłanie danych wymagają osobnej decyzji:

- **`L0` Doradza** (`domyślnie`) — wyjaśnia i planuje, niczego nie dotyka.
- **`L1` Czyta zatwierdzone pliki** (`approve --yes`) — tylko dokładna lista plików, ważna przez 24h.
- **`L2` Sprawdza komputer lokalnie** (`inventory --yes`) — lista programów i portów, bez nazwy hosta i użytkownika.
- **`L3` Odpytuje bazy luk CVE** (`--share-package-names`) — wysyła nazwy, wersje i ekosystemy pakietów do OSV.dev; osobno pobiera publiczną listę CISA KEV.
- **`L4` Sprawdza Twoją stronę WWW** (`--authorized`) — kilka zwykłych, pasywnych zapytań `GET`.
- **`L5` Wdrożenie zmian** (`Twoja decyzja`) — agent przygotowuje łatkę i plan cofnięcia; zmiany wdrażasz Ty.

---

## 🚀 Szybki start w 60 sekund

Wymagane: **Node.js 22+** oraz **Git**. Lokalne narzędzie CLI nie wymaga żadnych zewnętrznych pakietów npm ani płatnych kluczy API.

```sh
git clone --branch codex/node-v0.1 https://github.com/aievolutionpl/cyber-defense-agent.git
cd cyber-defense-agent
node tools/demo.mjs
```

Chcesz przejść przez interaktywne, kolorowe **Terminalowe Centrum Dowodzenia (PL/EN)** lub uruchomić **Lokalny Mini Interfejs Graficzny (GUI + Mostek Claude Code / Codex CLI)**?

```sh
# 1. Kolorowe Terminalowe Centrum Dowodzenia (wybór PL / EN na starcie, 8 komend):
node tools/cda.mjs start

# 2. Lokalny Mini Interfejs Graficzny w przeglądarce (127.0.0.1:3109) + Mostek Agentów:
node tools/cda.mjs ui

# 3. Bezpośredni generator komend i promptów dla Claude Code CLI / Codex CLI:
node tools/cda.mjs agent --host claude --mission code --lang pl
node tools/cda.mjs agent --host codex --mission pc --lang pl
```

<p align="center">
  <img src="docs/assets/mini-interface-preview.png" alt="Cyber Defense Agent — Lokalny Mini Interfejs Graficzny i Mostek Claude Code CLI & Codex CLI" width="100%" />
</p>

W panelu wybierz cel audytu. Dla projektu wpisz katalog oraz dokładne ścieżki plików, po jednej w wierszu. Panel pokaże pełny zakres do zatwierdzenia przed odczytem. Audyt komputera ma osobną zgodę na przekazanie nazw i wersji pakietów do OSV.dev. Wynik i historia kroków pojawiają się w panelu, a raport HTML otworzysz z listy plików.

Przycisk uruchomienia agenta przekazuje jedno zadanie do zainstalowanego Claude Code lub Codexa i pokazuje wyjście sesji. Dalszą rozmowę prowadzisz w swoim czacie lub terminalu agenta.


### Najważniejsze polecenia CLI (v0.2)

```sh
# 1. Wyznacz zakres (np. tylko pliki zmienione w Git przed commitem) i zatwierdź:
node tools/cda.mjs scope --root /sciezka/do/projektu --git-staged --name audit
node tools/cda.mjs approve --scope audit --root /sciezka/do/projektu --yes

# 2. Uruchom lokalny przegląd bezpieczeństwa (8 reguł v0.2: sekrety, TLS, eval, XSS, config agentów):
node tools/cda.mjs review --scope audit --name before

# 3. Sprawdź komputer lub stronę WWW (zawsze z jawną flagą zgody):
node tools/cda.mjs inventory --name pc --yes
node tools/cda.mjs advisories --inventory pc --name pc-vulns --share-package-names
node tools/cda.mjs web --url https://twoja-strona.pl --name site --authorized

# 4. Wygeneruj ciemny raport wizualny HTML + PDF (po polsku) oraz panel na żywo:
node tools/cda.mjs report --name raport-audytu --from before --from site --lang pl --pdf
node tools/cda.mjs dashboard --scope audit --lang pl

# 5. Wygeneruj podsumowanie Markdown gotowe do komentarza w GitHub Pull Request:
node tools/cda.mjs pr-comment --scope audit --report before --name pr-summary
```

---

<a id="codex"></a>
### Uruchomienie w OpenAI Codex
Otwórz sklonowane repozytorium w aplikacji Codex lub uruchom w terminalu `codex`, a następnie wpisz:
```text
$cyber-defense demo
```

<a id="claude-code"></a>
### Uruchomienie w Claude Code
W katalogu repozytorium uruchom `claude`, a następnie wpisz:
```text
/cyber-defense demo
```

<a id="hermes-experimental"></a>
### Uruchomienie w Hermes (eksperymentalne)
Otwórz repozytorium w środowisku Hermes i poproś agenta o wczytanie [`skills/cyber-defense/SKILL.md`](skills/cyber-defense/SKILL.md) oraz wykonanie kroków demo.

---

<a id="english-documentation"></a>
## 🇬🇧 English Documentation

**Cyber Defense Agent (v0.2)** is a Polish-born, open-source defensive security skill and zero-dependency Node.js CLI created by **[AI Evolution Polska](https://github.com/aievolutionpl)**. It turns your AI coding agent (**Codex**, **Claude Code**, **Cursor**, **Google Antigravity**, **Lovable**, **Hermes**) into a structured security reviewer.

- 🌐 **Live Interactive Presentation**: [Polish (Default)](https://aievolutionpl.github.io/cyber-defense-agent/) · [English Version](https://aievolutionpl.github.io/cyber-defense-agent/en/)
- 📄 **Sample Visual PDF Report**: [English PDF](examples/sample-audit-report.pdf) · [Polish PDF](examples/sample-audit-report-pl.pdf)

The website includes a seven-scenario brief planner for Codex and Claude Code. The new [agent-security playbook](skills/cyber-defense/references/knowledge/agent-security.md) covers skills, MCP permissions, memory and trust boundaries. It is a read-only review method, not an automatic MCP scanner. Local CLI commands do not call a model; your AI host has its own data-handling settings and costs.

### Key Capabilities
1. **One Skill, Every Agent**: Drop-in `.agents/skills`, `.claude/skills`, and `.hermes/skills` entry points backed by ten knowledge documents (`skills/cyber-defense/references/knowledge/`).
2. **Seven Review Scenarios**:
   - **Computer & Server (`inventory` → `advisories`)**: Lists installed packages and listening ports on Windows, macOS, and Linux; checks OSV.dev and CISA KEV.
   - **Website & Web App (`web`)**: Passive HTTP/TLS posture check (HTTPS, HSTS, CSP, cookies, CORS, certificate).
   - **Code & Dependencies (`deps`, `review`, `import`)**: Parses 6 lockfile ecosystems, detects hardcoded secrets, `NEXT_PUBLIC_`/`VITE_` client secret exposure (`CDA-PUBLIC-001`), hidden bidirectional/zero-width Unicode in agent instructions (`CDA-AGENT-001`), dangerous flag bypasses (`CDA-AGENT-002`), DOM XSS sinks (`CDA-XSS-001`), and imports Gitleaks/Trivy/OSV/SARIF reports.
   - **AI Agents, Skills & MCP**: Read-only configuration and source review of tool authority, consent, memory isolation and data flow; expert judgment, not a new scanner.
   - **Databases, Networks & Incident First Response**: Read-only guided playbooks.
3. **Visual HTML/PDF Reports & Live Dashboard**: Run `node tools/cda.mjs report --pdf` and `node tools/cda.mjs dashboard` to generate dark executive reports and a self-refreshing local dashboard before applying any fixes.
4. **Strict Consent Ladder**: Every file read, inventory query, OSV lookup, or passive web check requires an explicit CLI consent flag. Tools are 100% read-only.

### Quick Start (English)
```sh
git clone --branch codex/node-v0.1 https://github.com/aievolutionpl/cyber-defense-agent.git
cd cyber-defense-agent
node tools/demo.mjs
```

---

## 🛠️ Rozwój strony i weryfikacja jakości

```sh
npm ci
npm run dev     # serwer deweloperski: http://localhost:3107
npm run check   # check:skills + testy narzędzi + ESLint + TypeScript + Next.js static build
npm run demo    # lokalne demo na danych syntetycznych
```

Więcej dokumentacji technicznej:
- [Architektura i granice zaufania](docs/ARCHITECTURE.md)
- [Model zagrożeń (Threat Model)](docs/THREAT_MODEL.md)
- [Integracja skanerów (Gitleaks, Trivy, OSV, SARIF)](docs/SCANNER_INTEGRATIONS.md)
- [Zgodność z hostami agentów](docs/HOST_COMPATIBILITY.md)
- [Odpowiedzialne użycie](docs/RESPONSIBLE_USE.md) · [Prywatność](PRIVACY.md) · [Polityka bezpieczeństwa](SECURITY.md)

---

## 🏆 Kredyty i Licencja

Projekt stworzony i rozwijany przez **[AI Evolution Polska](https://github.com/aievolutionpl)** (`@aievolutionpl`).
Kod źródłowy udostępniany jest na otwartej licencji **[MIT](LICENSE)**.
