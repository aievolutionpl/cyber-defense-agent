# Cyber Defense Agent — raport v0.1.0

Data: 2026-11-09T19:04:35.955Z

Źródło: lokalne reguły statyczne

## Zakres

- package.json
- reports/before.sarif
- reports/partial.json

## Ustalenia (1)

### P1 · Lodash: wersja objęta GHSA-35jh-r3h4-6jhm

- Reguła: CDA-DEP-001
- Lokalizacja: package.json:7
- Waga: high
- Pewność: high
- Status: do weryfikacji
- Zredagowany dowód: Manifest deklaruje lodash 4.17.20; znana poprawka: 4.17.21. Osiągalność funkcji template nie była badana.
- Proponowana poprawka: Zaktualizuj lodash do co najmniej 4.17.21, odśwież lockfile w swoim procesie i sprawdź zgodność. Agent nie instaluje zależności.

## Pokrycie i ograniczenia

Kontrole: 5; niejednoznaczne: 0; pominięte pliki: 1.

Kontrole statyczne nie potwierdzają osiągalności ani wykorzystania podatności.

Brak wyniku nie jest dowodem bezpieczeństwa. Narzędzie nie wykonuje kodu ani ruchu sieciowego.
