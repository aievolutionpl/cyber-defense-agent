"use client";
import { useEffect, useRef, useState } from "react";
import { RotateCcw, ShieldCheck, Terminal, User } from "lucide-react";
import type { Locale } from "@/lib/config";
import { TabBar } from "./ui";

type Line = { who: "user" | "agent" | "cmd" | "out"; text: [string, string] };
type Scenario = {
  id: string;
  label: [string, string];
  context: [string, string];
  lines: Line[];
  result: { title: [string, string]; items: [string, [string, string]][]; note: [string, string] };
};

const scenarios: Scenario[] = [
  {
    id: "pc",
    label: ["My computer", "Mój komputer"],
    context: ["Ubuntu 24.04 workstation · sample data", "Stacja robocza Ubuntu 24.04 · dane przykładowe"],
    lines: [
      { who: "user", text: ["Check my computer. What should I update?", "Sprawdź mój komputer. Co powinienem zaktualizować?"] },
      { who: "agent", text: ["I'll list installed programs and open ports with built-in read-only commands. I don't record the computer or user name and I install nothing. OK to run it?", "Wypiszę zainstalowane programy i otwarte porty wbudowanymi poleceniami tylko do odczytu. Nie zapisuję nazwy komputera ani użytkownika, niczego nie instaluję. Mogę?"] },
      { who: "user", text: ["Yes.", "Tak."] },
      { who: "cmd", text: ["node tools/cda.mjs inventory --name pc --yes", "node tools/cda.mjs inventory --name pc --yes"] },
      { who: "out", text: ["packages: 1412 · dpkg ok · networkReachablePorts: [22, 5432] · network: false", "packages: 1412 · dpkg ok · networkReachablePorts: [22, 5432] · network: false"] },
      { who: "agent", text: ["1,412 packages found. To check them for known vulnerabilities I'd send only names and versions to OSV.dev. Agreed?", "Mam 1412 pakietów. Żeby sprawdzić znane luki, wyślę do OSV.dev wyłącznie nazwy i wersje. Zgoda?"] },
      { who: "user", text: ["Agreed.", "Zgoda."] },
      { who: "cmd", text: ["node tools/cda.mjs advisories --inventory pc --name pc-vulns --share-package-names", "node tools/cda.mjs advisories --inventory pc --name pc-vulns --share-package-names"] },
      { who: "out", text: ["checked: 1412 · P0: 1 · P1: 2 · P2: 6 · kev: cisa.gov KEV catalog", "checked: 1412 · P0: 1 · P1: 2 · P2: 6 · kev: cisa.gov KEV catalog"] },
    ],
    result: {
      title: ["Three things first. The rest can wait.", "Najpierw trzy rzeczy. Reszta może poczekać."],
      items: [
        ["P0", ["A system library has a flaw attackers are using right now. Fixed version available: run the system update today.", "Biblioteka systemowa ma lukę, której atakujący używają teraz. Jest poprawiona wersja: zrób aktualizację systemu dziś."]],
        ["P1", ["PostgreSQL listens on the network (port 5432). If only this machine uses it, bind it to localhost.", "PostgreSQL nasłuchuje w sieci (port 5432). Jeśli korzysta z niego tylko ten komputer, ogranicz go do localhost."]],
        ["P1", ["Two packages are inside a published vulnerable range. Update, then I re-check and confirm.", "Dwa pakiety mieszczą się w opublikowanym podatnym zakresie. Zaktualizuj, a ja sprawdzę ponownie i potwierdzę."]],
      ],
      note: ["Not covered: portable apps, browser extensions, firmware. I say so in every report.", "Poza zakresem: aplikacje przenośne, rozszerzenia przeglądarki, firmware. Piszę o tym w każdym raporcie."],
    },
  },
  {
    id: "web",
    label: ["My website", "Moja strona"],
    context: ["A small online shop · sample data", "Mały sklep internetowy · dane przykładowe"],
    lines: [
      { who: "user", text: ["Check my site: https://shop.example", "Sprawdź moją stronę: https://sklep.example"] },
      { who: "agent", text: ["I'll make a few ordinary requests, like a browser, and read the security headers and certificate. No logins, no attack traffic. Do you confirm this is your site?", "Wyślę kilka zwykłych zapytań, jak przeglądarka, i przeczytam nagłówki bezpieczeństwa oraz certyfikat. Bez logowania i bez ruchu atakującego. Potwierdzasz, że to Twoja strona?"] },
      { who: "user", text: ["Yes, it's mine.", "Tak, moja."] },
      { who: "cmd", text: ["node tools/cda.mjs web --url https://shop.example --name site --authorized", "node tools/cda.mjs web --url https://sklep.example --name site --authorized"] },
      { who: "out", text: ["requests: 3 · P1: 0 · P2: 3 · P3: 4", "requests: 3 · P1: 0 · P2: 3 · P3: 4"] },
    ],
    result: {
      title: ["No emergency. Three gaps worth an hour.", "Nic pilnego. Trzy luki warte godziny pracy."],
      items: [
        ["P2", ["The session cookie lacks HttpOnly and SameSite: a malicious script could take over a login. Add both flags.", "Ciasteczko sesji nie ma HttpOnly i SameSite: złośliwy skrypt mógłby przejąć logowanie. Dodaj obie flagi."]],
        ["P2", ["No Content-Security-Policy: an injected script would run without limits. Here is a starter policy to paste.", "Brak Content-Security-Policy: wstrzyknięty skrypt działałby bez ograniczeń. Oto startowa polityka do wklejenia."]],
        ["P2", ["No HSTS: a visitor on public Wi-Fi can be pushed back to HTTP. One header fixes it.", "Brak HSTS: gościa w publicznym Wi-Fi da się cofnąć do HTTP. Naprawia to jeden nagłówek."]],
      ],
      note: ["This check sees headers and the certificate. Logic flaws and anything behind a login need the code review.", "Ten test widzi nagłówki i certyfikat. Błędy logiki i to, co za logowaniem, wymagają przeglądu kodu."],
    },
  },
  {
    id: "project",
    label: ["My project", "Mój projekt"],
    context: ["A Node.js app before release · sample data", "Aplikacja Node.js przed wydaniem · dane przykładowe"],
    lines: [
      { who: "user", text: ["Review my project before release.", "Przejrzyj projekt przed wydaniem."] },
      { who: "agent", text: ["I'll start with dependencies. I'd read only package-lock.json through the local tool, for 24 hours. Do you approve exactly this file?", "Zacznę od zależności. Przeczytam tylko package-lock.json przez lokalne narzędzie, na 24 godziny. Zatwierdzasz dokładnie ten plik?"] },
      { who: "user", text: ["Approved.", "Zatwierdzam."] },
      { who: "cmd", text: ["node tools/cda.mjs deps --scope audit --input package-lock.json --name deps", "node tools/cda.mjs deps --scope audit --input package-lock.json --name deps"] },
      { who: "out", text: ["packages: 842 · ecosystem: npm · network: false", "packages: 842 · ecosystem: npm · network: false"] },
      { who: "agent", text: ["842 packages. May I send their names and versions to OSV.dev?", "842 paczki. Czy mogę wysłać ich nazwy i wersje do OSV.dev?"] },
      { who: "user", text: ["Go ahead.", "Wysyłaj."] },
      { who: "cmd", text: ["node tools/cda.mjs advisories --inventory deps --name deps-vulns --share-package-names", "node tools/cda.mjs advisories --inventory deps --name deps-vulns --share-package-names"] },
      { who: "out", text: ["checked: 842 · affectedPackages: 3 · P1: 1 · P2: 2", "checked: 842 · affectedPackages: 3 · P1: 1 · P2: 2"] },
    ],
    result: {
      title: ["One fix before you ship.", "Jedna poprawka przed wydaniem."],
      items: [
        ["P1", ["lodash 4.17.20 allows command injection (CVE-2021-23337). Fixed in 4.17.21: a one-line upgrade.", "lodash 4.17.20 pozwala na wstrzyknięcie poleceń (CVE-2021-23337). Naprawione w 4.17.21: zmiana jednej linii."]],
        ["P2", ["Two transitive packages have medium-severity advisories. Upgrading their parent removes both.", "Dwie paczki pośrednie mają ostrzeżenia o średniej wadze. Aktualizacja paczki nadrzędnej usuwa obie."]],
        ["OK", ["After your change I repeat the same check: confirmed_fixed, or an honest “not enough data”.", "Po Twojej zmianie powtarzam ten sam test: confirmed_fixed albo uczciwe „za mało danych”."]],
      ],
      note: ["A version match shows the weakness is present. Whether your code reaches it is a separate question I flag.", "Zgodność wersji pokazuje, że słabość jest obecna. Czy Twój kod jej używa, to osobne pytanie i tak to oznaczam."],
    },
  },
];
const delay = { user: 950, agent: 1500, cmd: 900, out: 750 } as const;

export function LiveSession({ locale }: { locale: Locale }) {
  const i = locale === "pl" ? 1 : 0;
  const pl = locale === "pl";
  const [tab, setTab] = useState("pc");
  // Everything is visible on the server and without JavaScript; the sequence is an enhancement.
  const [shown, setShown] = useState(Number.POSITIVE_INFINITY);
  const [active, setActive] = useState(false);
  const region = useRef<HTMLDivElement>(null);
  const played = useRef(false);
  const scenario = scenarios.find((s) => s.id === tab)!;
  const total = scenario.lines.length + 1;

  useEffect(() => {
    const el = region.current;
    if (!el) return;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => setActive(visible && !query.matches && document.documentElement.dataset.motion === "running");
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.35 });
    observer.observe(el);
    const mutation = new MutationObserver(update);
    mutation.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    query.addEventListener("change", update);
    return () => { observer.disconnect(); mutation.disconnect(); query.removeEventListener("change", update); };
  }, []);

  useEffect(() => {
    if (active && !played.current) {
      played.current = true;
      const id = setTimeout(() => setShown(0), 0);
      return () => clearTimeout(id);
    }
  }, [active]);

  useEffect(() => {
    if (!active || shown >= total) return;
    const next = scenario.lines[shown];
    const id = setTimeout(() => setShown((value) => value + 1), next ? delay[next.who] : 900);
    return () => clearTimeout(id);
  }, [active, shown, total, scenario]);

  const start = (id: string) => {
    setTab(id);
    setShown(active ? 0 : Number.POSITIVE_INFINITY);
  };

  return (
    <section className="live-section section-shell" id="live" aria-labelledby="live-title">
      <div className="section-heading" data-reveal>
        <div>
          <span className="eyebrow">{pl ? "ZOBACZ, JAK PRACUJE" : "WATCH IT WORK"}</span>
          <h2 id="live-title">
            {pl ? "Rozmowa zamiast" : "A conversation,"}
            <br />
            <span className="gradient-text">{pl ? "ściany alertów." : "not a wall of alerts."}</span>
          </h2>
        </div>
        <p>
          {pl
            ? "Pytanie o zgodę, dowód, priorytety, plan. Tak wygląda przebieg sesji. Dane w tym pokazie są przykładowe."
            : "A consent question, evidence, priorities, a plan. This is how a session runs. The data in this walkthrough is sample data."}
        </p>
      </div>
      <div className="live-window" ref={region} data-reveal data-playing={active && shown < total}>
        <div className="live-bar">
          <span className="live-dots" aria-hidden="true"><i /><i /><i /></span>
          <TabBar prefix="live" tabs={scenarios.map((s) => ({ id: s.id, label: s.label[i] }))} value={tab} onChange={start} label={pl ? "Scenariusze sesji" : "Session scenarios"} />
          <button type="button" className="live-replay" onClick={() => start(tab)} aria-label={pl ? "Odtwórz sesję od początku" : "Replay the session"}>
            <RotateCcw size={14} aria-hidden="true" />
            <span>{pl ? "Od nowa" : "Replay"}</span>
          </button>
        </div>
        <div className="live-body" role="tabpanel" id={`live-panel-${tab}`} aria-labelledby={`live-tab-${tab}`} tabIndex={0}>
          <div className="live-chat">
            <p className="live-context mono">
              <span className="demo-tag">{pl ? "DEMO / DANE PRZYKŁADOWE" : "DEMO / SAMPLE DATA"}</span>
              {scenario.context[i]}
            </p>
            {scenario.lines.map((line, n) => (
              <div key={`${tab}-${n}`} className={`live-line live-${line.who}`} data-shown={n < shown}>
                {line.who === "user" && <span className="live-avatar"><User size={14} aria-hidden="true" /></span>}
                {line.who === "agent" && <span className="live-avatar agent"><ShieldCheck size={14} aria-hidden="true" /></span>}
                {line.who === "cmd" && <span className="live-prompt" aria-hidden="true">$</span>}
                {line.who === "cmd" || line.who === "out" ? <code>{line.text[i]}</code> : <p><span className="sr-only">{line.who === "user" ? (pl ? "Ty: " : "You: ") : "Agent: "}</span>{line.text[i]}</p>}
              </div>
            ))}
          </div>
          <aside className="live-result" data-shown={shown >= scenario.lines.length} aria-label={pl ? "Wynik sesji" : "Session result"}>
            <span className="eyebrow"><Terminal size={13} aria-hidden="true" />{pl ? "WYNIK DLA CIEBIE" : "YOUR RESULT"}</span>
            <h3>{scenario.result.title[i]}</h3>
            <ol>
              {scenario.result.items.map(([priority, text]) => (
                <li key={text[0]}>
                  <span className={`prio prio-${priority.toLowerCase()}`}>{priority}</span>
                  <p>{text[i]}</p>
                </li>
              ))}
            </ol>
            <p className="live-note">{scenario.result.note[i]}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
