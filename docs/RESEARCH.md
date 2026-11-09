# Baza wiedzy i research GitHub

Sprawdzono **20 repozytoriów 9 listopada 2026** przez GitHub REST API. [Zapis metadanych](research-sources.json) zawiera adresy, licencję deklarowaną przez API, stan archiwizacji i datę ostatniego pushu. To badanie źródeł i plan integracji, nie wynik benchmarku agenta. Popularność, data pushu i lektura repo nie potwierdzają ekspertyzy ani skuteczności.

Żaden z tych projektów nie jest automatycznie instalowany lub uruchamiany przez v0.1. Nie skopiowano ich kodu ani zestawów reguł. Dołączony skill korzysta z własnej procedury, a narzędzia mają własne cztery proste kontrole.

## Standardy, na których oprzeć analizę

| Źródło | Jak wykorzystać | Stan/licencja z API |
|---|---|---|
| [OWASP ASVS](https://github.com/OWASP/ASVS) | Checklista wymagań: autoryzacja, sesje, walidacja, kryptografia. Mapować ustalenia do kontroli po weryfikacji kontekstu. | aktywne, CC-BY-SA-4.0 |
| [OWASP WSTG](https://github.com/OWASP/wstg) | Projektowanie scenariuszy i wymaganych dowodów; kontrole web dopiero w osobnym zatwierdzonym labie. | aktywne, CC-BY-SA-4.0 |
| [OWASP API Security](https://github.com/OWASP/API-Security) | Modelować autoryzację obiektową i funkcji, limity i ekspozycję danych. | aktywne; API nie identyfikuje jednoznacznej licencji |
| [HackTricks](https://github.com/HackTricks-wiki/hacktricks) | Materiał do nauki i weryfikowania hipotez w izolowanym labie; nie kopiować poleceń do audytu. | aktywne; brak licencji rozpoznanej przez API |
| [Sigma](https://github.com/SigmaHQ/sigma) | Reguły detekcji i wymagania wobec logów dla przyszłej analizy defensywnej. | aktywne; zasady kodu i reguł wymagają osobnego przeglądu |

## Narzędzia z największą wartością dla kolejnego wydania

| Projekt | Proponowane zastosowanie | Decyzja na teraz |
|---|---|---|
| [Semgrep](https://github.com/semgrep/semgrep) | Dojrzały SAST i SARIF jako wejście do triage. | Najpierw kontrakt eksportera; API: LGPL-2.1. Reguły i funkcje komercyjne mają osobne warunki. |
| [Gitleaks](https://github.com/gitleaks/gitleaks) | Dokładniejsza lokalna detekcja sekretów, zawsze z redakcją. | Kandydat do offline adaptera; MIT. |
| [Trivy](https://github.com/aquasecurity/trivy) | Zależności, SBOM i konfiguracja; jawnie rozdzielić trafienie CVE od osiągalności. | Kandydat do adaptera; Apache-2.0; aktualizacja bazy to osobny kontrolowany przepływ sieciowy. |
| [DefectDojo](https://github.com/DefectDojo/django-DefectDojo) | Import, deduplikacja, ponowny import i cykl życia ustalenia. | Inspiracja modelu danych / przyszły eksport; BSD-3-Clause. |
| [Nuclei](https://github.com/projectdiscovery/nuclei) | W przyszłości ręcznie ocenione i przypięte szablony w autoryzowanym stagingu. | MIT dla silnika; nieobecne w v0.1, szablony oceniać osobno. |
| [Nmap](https://github.com/nmap/nmap) | Nauka inwentaryzacji usług i planowania zakresu sieci. | Nie bundle’ować bez przeglądu NPSL/OEM. API zwraca NOASSERTION. |

## Agenci: proces, dowody i obserwowalność

| Projekt | Czego się uczymy | Ograniczenie |
|---|---|---|
| [Strix](https://github.com/usestrix/strix) | Rozdzielanie planowania, wykonania, sandboxa i artefaktów. | Apache-2.0; nie uruchomiono, nie zmierzono jakości. |
| [Shannon](https://github.com/keygraphhq/shannon) | Przepływ od hipotezy w kodzie do weryfikacji i raportu. | AGPL-3.0; inspiracja procesu, bez kopiowania kodu. |
| [PentestGPT](https://github.com/GreyDGL/PentestGPT) | Rejestrowanie eksperymentów i rozdzielanie planowania od wykonania. | MIT; wyniki autorów nie są wynikami naszego agenta. |
| [PentAGI](https://github.com/vxcontrol/pentagi) | Historia zadań, obserwowalność i praca z długimi procesami. | MIT; rozbudowane zależności, nie integrować automatycznie. |
| [CAI](https://github.com/aliasrobotics/cai) | Materiał badawczy do izolowanych testów agentów i prompt injection. | **Zarchiwizowane**; API nie wskazuje jednoznacznej licencji. |

## Nauka testów penetracyjnych i obrony w labie

| Projekt | Bezpieczne zastosowanie edukacyjne | Licencja / stan |
|---|---|---|
| [OWASP Juice Shop](https://github.com/juice-shop/juice-shop) | Lokalne syntetyczne błędy aplikacji i kontrolowane ćwiczenia dowodowe. | MIT, aktywne |
| [OWASP crAPI](https://github.com/OWASP/crAPI) | Izolowane ćwiczenia autoryzacji API na syntetycznych kontach. | Apache-2.0, aktywne |
| [CALDERA](https://github.com/apache/caldera) | Emulacja w kontrolowanym labie i ocena telemetrii obronnej. | Repo przeniesione z mitre do Apache; API: Apache-2.0. |
| [Atomic Red Team](https://github.com/redcanaryco/atomic-red-team) | Małe jawne testy kontroli obronnych na własnych maszynach laboratoryjnych. | MIT; nie wykonywać na realnej sieci w ramach tego skilla. |

Lab pozostaje oddzielnym projektem wykonawczym. Samo dodanie linków nie daje zgody na skanowanie sieci, uruchamianie testów penetracyjnych ani instalowanie ich zależności. v0.1 nie zawiera narzędzi do takich działań.

## Priorytet rozwoju

1. Offline import i walidacja eksportów SARIF z Semgrep, Gitleaks i Trivy; zestaw testów z czystymi kontrolkami i spreparowanymi raportami.
2. Baza reguł z jawnie przypiętymi wersjami, kontrolami ASVS i prawami do użycia. Zmierzyć false positive/negative na odłożonym zbiorze.
3. Dopiero po niezależnej bramce zgody i egress: izolowany lab Juice Shop/crAPI, limity i STOP, a potem zatwierdzony pilot web/API.
4. Sieć i emulacja zagrożeń jako osobny runner i profil. Żadnego „uczenia eksperta” przez bezkrytyczne ładowanie repozytoriów do promptu.

Licencja z API jest wskaźnikiem, nie pełną analizą prawną. NOASSERTION lub null oznacza **nieustaloną**, nie brak ograniczeń. Przed integracją przypnij commit, przeczytaj LICENSE kodu, reguł, modeli i obrazów, oceń zależności oraz zapisz wynik testów.
