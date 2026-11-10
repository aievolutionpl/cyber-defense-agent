"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, FileCheck2, Fingerprint, GitBranch, Globe, Layers3, ShieldCheck, Terminal } from "lucide-react";
import { type Locale } from "@/lib/config";

/** A visual explanation with synthetic examples, never a running scanner. */
export function SkillBlueprint({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const [selected, setSelected] = useState(0);
  const diagram = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = diagram.current;
    if (!node) return;
    let visible = false;
    const update = () => node.classList.toggle("is-visible", visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(node);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  const examples = pl ? [
    { label: "Przed publikacją kodu", icon: GitBranch, prompt: "Sprawdź mój projekt przed publikacją.", scope: "Zatwierdzone pliki projektu", finding: "Sekret zapisany w konfiguracji", action: "Usuń sekret z pliku i zaplanuj rotację klucza.", evidence: "Lokalizacja w pliku, ukryta wartość, instrukcja weryfikacji." },
    { label: "Przegląd strony", icon: Globe, prompt: "Sprawdź podstawowe zabezpieczenia mojej strony.", scope: "Jeden autoryzowany adres WWW", finding: "Brak nagłówka Content-Security-Policy", action: "Przygotuj politykę CSP dopasowaną do zasobów strony.", evidence: "Nagłówki odpowiedzi i ograniczenia pasywnej kontroli." },
    { label: "Raporty skanerów", icon: Layers3, prompt: "Połącz wyniki skanerów i pomóż ustalić priorytety.", scope: "Zatwierdzone pliki raportów", finding: "Podatna zależność w raporcie Trivy", action: "Sprawdź wersję z poprawką i zaplanuj aktualizację.", evidence: "Pakiet, źródło raportu i porównanie kolejnego wyniku." },
  ] : [
    { label: "Before shipping code", icon: GitBranch, prompt: "Review my project before I publish it.", scope: "Approved project files", finding: "A secret stored in configuration", action: "Remove the secret and plan a key rotation.", evidence: "File location, hidden value and verification instructions." },
    { label: "Website check", icon: Globe, prompt: "Check the basic protections on my website.", scope: "One authorized website address", finding: "Missing Content-Security-Policy header", action: "Prepare a CSP that fits the resources your site uses.", evidence: "Response headers and the limits of a passive check." },
    { label: "Scanner reports", icon: Layers3, prompt: "Combine scanner results and help prioritize the work.", scope: "Approved report files", finding: "A vulnerable dependency in a Trivy report", action: "Review the fixed version and plan an update.", evidence: "Package, report source and comparison with a later result." },
  ];
  const current = examples[selected];
  return <section className="blueprint-section section-shell" id="skill" aria-labelledby="blueprint-title">
    <div className="blueprint-heading">
      <span className="eyebrow">{pl ? "POZNAJ SKILL / OD PYTANIA DO DOWODU" : "MEET THE SKILL / FROM QUESTION TO EVIDENCE"}</span>
      <h2 id="blueprint-title">{pl ? <>Twój agent ma narzędzia.<br /><span>Daj mu metodę.</span></> : <>Your agent has tools.<br /><span>Give it a method.</span></>}</h2>
      <p>{pl ? "Skill to instrukcje, playbooki i lokalne narzędzia, które dodajesz do agenta AI. Porządkuje jego pracę: najpierw zakres, potem dowody, priorytety i sprawdzenie poprawki." : "A skill is a set of instructions, playbooks and local tools you add to your AI agent. It gives the work a structure: scope first, then evidence, priorities and verification."}</p>
    </div>
    <div className="blueprint-composition">
      <div ref={diagram} className="blueprint-diagram" aria-label={pl ? "Agent AI korzysta ze skilla, aby przygotować raport z dowodami" : "Your AI agent uses the skill to prepare an evidence-based report"}>
        <div className="blueprint-grid" aria-hidden="true" />
        <div className="blueprint-source"><Terminal size={22} /><span>{pl ? "TWÓJ AGENT AI" : "YOUR AI AGENT"}</span><small>Codex / Claude Code</small></div>
        <div className="blueprint-wire" aria-hidden="true"><i /></div>
        <div className="blueprint-core">
          <span className="blueprint-orbit" aria-hidden="true" />
          <ShieldCheck size={48} strokeWidth={1.3} />
          <strong>CYBER DEFENSE</strong><span>SKILL</span>
        </div>
        <div className="blueprint-layers">
          <span><BookOpen size={16} />{pl ? "9 playbooków" : "9 playbooks"}</span>
          <span><Fingerprint size={16} />{pl ? "Lokalne dowody" : "Local evidence"}</span>
          <span><FileCheck2 size={16} />{pl ? "Raport + retest" : "Report + retest"}</span>
        </div>
        <p className="blueprint-caption">{pl ? "Ty wyznaczasz zakres. Agent wyjaśnia wynik." : "You set the scope. Your agent explains the result."}</p>
      </div>
      <div className="blueprint-example">
        <fieldset className="blueprint-options">
          <legend>{pl ? "Wybierz przykładowe zadanie" : "Choose an example task"}</legend>
          {examples.map((example, index) => <label key={example.label}>
            <input type="radio" name={`blueprint-${locale}`} checked={selected === index} onChange={() => setSelected(index)} />
            <span><example.icon size={16} />{example.label}</span>
          </label>)}
        </fieldset>
        <div className="blueprint-result" aria-live="polite" aria-atomic="true">
          <span className="blueprint-demo">{pl ? "PRZYKŁAD • SYMULACJA, BEZ SKANOWANIA" : "EXAMPLE • SIMULATION, NO SCANNING"}</span>
          <blockquote>“{current.prompt}”</blockquote>
          <dl>
            <div><dt>01 / {pl ? "Zakres" : "Scope"}</dt><dd>{current.scope}</dd></div>
            <div><dt>02 / {pl ? "Sygnał" : "Finding"}</dt><dd>{current.finding}</dd></div>
            <div><dt>03 / {pl ? "Następny krok" : "Next step"}</dt><dd>{current.action}</dd></div>
            <div><dt>04 / {pl ? "Dowód" : "Evidence"}</dt><dd>{current.evidence}</dd></div>
          </dl>
        </div>
        <a className="subtle-link" href="#install">{pl ? "Dodaj skill do swojego agenta" : "Add the skill to your agent"}<ArrowRight size={17} /></a>
      </div>
    </div>
    <div className="blueprint-takeaway">
      <span>{pl ? "CO ZOSTAJE PO AUDYCIE" : "WHAT YOU TAKE AWAY"}</span>
      <p>{pl ? "Lista priorytetów. Dowód przy każdym ustaleniu. Plan poprawki i sposób jej sprawdzenia." : "A priority list. Evidence for every finding. A fix plan and a way to verify it."}</p>
      <a href="#report">{pl ? "Zobacz przykładowy raport" : "See a sample report"}<ArrowRight size={18} /></a>
    </div>
  </section>;
}
