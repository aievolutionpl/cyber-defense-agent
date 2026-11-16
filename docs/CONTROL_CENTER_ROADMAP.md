# Cyber Defense: centrum pracy i plan integracji OpenCodeReview

Stan: 16 listopada 2026. Plan dotyczy lokalnego produktu, nie statycznej strony marketingowej.

## Cel produktu

Operator widzi, co sprawdzono, czego nie sprawdzono, jakie są dowody i co zrobić dalej. Sam licznik alertów nie jest oceną bezpieczeństwa. Zakończone uruchomienie nie jest potwierdzoną naprawą.

## Dostarczone w tej gałęzi

- Lokalny dashboard z responsywną nawigacją, licznikami uruchomień, postępem kroków i następnym krokiem.
- Przełączanie polskiego i angielskiego interfejsu. Zapisane tytuły i logi zachowują język oryginalnego uruchomienia.
- Start od syntetycznego demo. Nowy audyt projektu przyjmuje dokładną listę plików; zmiana celu lub listy resetuje zgodę.
- Inwentaryzacja komputera jest domyślnie offline. Wysłanie nazw i wersji pakietów do OSV.dev wymaga oddzielnej opcji.
- Historia z filtrem statusów, podgląd kroków, anulowanie i wznowienie istniejących workflowów.
- Raporty z wyszukiwaniem i filtrem formatu. Lista pokazuje ostatnie 40 plików zgodnie z istniejącym API.
- Wybór agenta, podgląd i kopiowanie promptu, informacja o dostępności CLI, historia ostatnich sesji i zatrzymanie sesji.
- Zadania dla hosta: przegląd zmian, plan retestu, plan użycia OpenCodeReview. Są to instrukcje dla agenta, nie nowe skanery.
- Dynamiczne dane są wstawiane jako tekst. Nazwy raportów, logi i komunikaty nie są interpretowane jako HTML.

Start: `node tools/cda.mjs ui`, następnie `http://127.0.0.1:3109/`.

## Co bierzemy z OpenCodeReview

Źródło: https://github.com/alibaba/open-code-review oraz dokumentacja https://open-codereview.ai/docs .

OpenCodeReview udostępnia przegląd diffów, pełnych plików, reguły dopasowywane do plików, strukturalny JSON, sesje i tryb delegowania do modelu hosta. W Cyber Defense warto zastosować deterministyczny dobór plików, widoczne pokrycie i osobną weryfikację ustaleń modelu.

Nie zakładamy poprawy jakości na podstawie samych wyników benchmarku producenta. Integrację mierzymy na własnych przykładach.

## Etap 1: adapter wyników i pokrycie

Priorytet P1. Najpierw offline import JSON z przypiętej, przetestowanej wersji OCR.

1. Zbadać rzeczywisty kontrakt JSON na syntetycznych fixture'ach i przypiąć wersję formatu.
2. Walidować rozmiar, typy, ścieżki, zakres linii, maksymalną liczbę wyników i powiązanie z zatwierdzonym snapshotem.
3. Zachować `source=opencodereview`, wersję narzędzia, commit bazowy/docelowy, rule ID i fingerprint. Usunąć sekrety ze snippetów przed raportowaniem.
4. Oznaczać sugestie jako `model judgment`, rozdzielić severity i confidence. Brak alertów w imporcie nigdy nie daje `confirmed_fixed`.
5. Manifest pokrycia: pliki wybrane, sprawdzone, pominięte, błędne i powód. Brak wiarygodnego manifestu daje `coverage unknown`.
6. Testy: traversal, HTML w tytułach, niezgodne commity, duplikaty, ucięty raport, pusta lista, niepoprawne numery linii, sekrety.

Gotowe, gdy zgodny raport trafia do istniejącego pipeline'u findings, a niezgodny jest odrzucany bez rozszerzania zakresu.

## Etap 2: bezpieczne uruchomienie OCR

Priorytet P1, po adapterze.

- Opcjonalny adapter procesu, bez dodawania zależności do bazowego CLI Node. Instalacja OCR jest oddzielnym krokiem operatora.
- Dwa tryby: zmiany między wskazanymi commitami i pełne zatwierdzone pliki.
- Najpierw podgląd listy plików, wersji OCR, modelu, odbiorcy danych, limitu czasu i budżetu.
- Zakres CDA nie ogranicza automatycznie odczytów wykonywanych przez OCR. Przed uruchomieniem potrzebny jest izolowany snapshot zawierający tylko dopuszczone dane lub zweryfikowany mechanizm egzekwowania zakresu.
- Sekrety, `.env`, klucze i prywatne raporty nie mogą być przekazywane jako kontekst. Dowolne instrukcje w repo są danymi, nie poleceniami operatora.
- Oddzielić zgodę na lokalny odczyt od zgody na przekazanie kodu do dostawcy modelu. Tryb delegowania korzysta z modelu hosta, nie oznacza automatycznie pracy offline.
- Anulowanie, limit procesu, błędy uwierzytelnienia, częściowe wyniki i wznowienie muszą być widoczne w historii.
- Bez automatycznej instalacji, napraw, publikacji komentarzy lub rozszerzenia uprawnień.

Gotowe, gdy testy dowodzą, że plik spoza listy nigdy nie trafia do modelu, a przerwana sesja nie jest oznaczana jako pełne pokrycie.

## Etap 3: centrum ustaleń

Priorytet P1.

Widok tabeli: priorytet, krótki opis ryzyka, projekt, źródło, status dowodu, właściciel, termin, ostatni retest. Filtry: nowe / nadal obecne / niepotwierdzone / potwierdzone naprawy. Łączenie duplikatów zachowuje dowody każdego źródła.

Po otwarciu ustalenia: wpływ w prostym języku, lokalizacja, zredagowany dowód, pewność, proponowany diff, rollback i warunki retestu. Zatwierdzenie planu naprawy nie zamyka ustalenia.

Odrzucenie jako fałszywy alarm wymaga powodu, autora i daty ważności. Akceptacja ryzyka jest osobnym statusem. Alert ponownie wykryty po naprawie wraca jako otwarty.

## Etap 4: projekty i obsługa klienta

Priorytet P2.

- Oddzielne projekty i profile zakresu z widoczną ważnością uprawnień.
- Presety: przed publikacją, po zmianie logowania, po aktualizacji zależności, retest po naprawach.
- Porównanie dwóch audytów, trend liczby otwartych potwierdzonych problemów i pokrycia. Bez arbitralnego wyniku „98% bezpieczny”.
- Raport zarządczy: trzy priorytety, wpływ, odpowiedzialny, termin. Raport techniczny: dowody i warunki weryfikacji.
- Eksport z brandingiem AI Evolution Polska / Tabasco Creatives, bez ujawniania sekretów i prywatnych ścieżek.
- Integracja GitHub PR: najpierw prywatny podgląd komentarza; publikacja i blokowanie merge są osobnymi, jawnymi ustawieniami.

## Etap 5: ocena jakości

Priorytet P2, przed włączeniem automatyzacji.

Trzy zestawy benchmarkowe: aplikacja z autoryzacją i izolacją tenantów; konfiguracje i zależności; poprawiony kod z kontrolnymi fałszywymi alarmami. Każdy ma wersję z problemem i poprawioną oraz oczekiwane wyniki.

Porównanie: obecne reguły CDA, OCR, CDA + OCR. Mierzymy trafność, pominięte problemy, fałszywe alarmy, poprawność lokalizacji, pokrycie, czas, tokeny (jeśli raportowane), koszt według skonfigurowanych stawek i skuteczność retestu. Nie estymujemy tokenów jako zmierzonych danych.

## Docelowy przepływ użytkownika

1. Wybierz projekt i zadanie.
2. Zobacz dokładny zakres, źródła danych i przewidywane działania.
3. Zatwierdź wymagane operacje; zapamiętaj zgodę wyłącznie dla jej zakresu i czasu ważności.
4. Obserwuj etapy, błędy, pominięte pliki i rzeczywiste pokrycie.
5. Otwórz trzy najważniejsze ustalenia oraz raport.
6. Przygotuj poprawkę, sprawdź diff i plan cofnięcia.
7. Po osobno zatwierdzonej naprawie uruchom retest i zobacz nowy dowód.

## Granice obecnego wydania

Nowy panel nie uruchamia OCR, nie skanuje ciągle w tle, nie zmienia kodu i nie instaluje aktualizacji. Nie dodaje modelowego czatu ani systemu wieloklientowego. Liczniki opisują faktyczne uruchomienia i pliki, a nie stan bezpieczeństwa infrastruktury. Autoryzacja hosta CLI i sesja z modelem wymagają osobnej weryfikacji w środowisku operatora.
