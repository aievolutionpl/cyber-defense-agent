'use client';
import { useRef, useState } from 'react';
import { ArrowRight, Check, RotateCcw, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/lib/config';

export function Onboarding({ locale }: { locale: Locale }) {
  const pl = locale === 'pl';
  const [answers, setAnswers] = useState<string[]>([]);
  const output = useRef<HTMLDivElement>(null);
  const questions = pl ? [
    { q: 'Co dziś chronimy?', options: ['Lokalne repozytorium', 'Raport JSON / SARIF', 'Plan izolowanego labu'] },
    { q: 'Co jest najważniejsze?', options: ['Przegląd przed wydaniem', 'Uporządkowanie ryzyk', 'Weryfikacja poprawek'] },
    { q: 'Jakie dane mogę uwzględnić w planie demo?', options: ['Tylko package.json', 'Manifest i raport SARIF'] },
  ] : [
    { q: 'What are we protecting today?', options: ['A local repository', 'A JSON / SARIF report', 'An isolated lab plan'] },
    { q: 'What matters most right now?', options: ['Review before release', 'Prioritise the risks', 'Verify the fixes'] },
    { q: 'Which demo files should the plan include?', options: ['Only package.json', 'Manifest and SARIF report'] },
  ];
  const choose = (option: string) => { setAnswers([...answers, option]); requestAnimationFrame(() => output.current?.focus()); };
  return <div className="onboarding" data-agent-target="Scout" data-agent-label={pl ? 'Układanie planu' : 'Mapping the plan'}><div className="onboarding-title"><span className="agent-avatar"><ShieldCheck size={20}/></span><div><strong>Cyber Guardian</strong><small>{pl ? 'Interaktywne demo · bez połączenia z modelem' : 'Interactive demo · no model connection'}</small></div><span className="demo-tag">DEMO</span></div><div className="conversation" ref={output} tabIndex={-1}>
    <div className="chat-message"><span className="mono">AGENT / 00</span><p>{pl ? 'Najpierw cel, potem zakres. Trzy krótkie pytania i przygotuję plan obrony.' : 'First the goal. Then the boundaries. Three quick questions and I’ll prepare a defense plan.'}</p></div>
    {answers.map((answer, i) => <div className="answered-question" key={i}><p>{questions[i].q}</p><span><Check size={13}/>{answer}</span></div>)}
    {answers.length < 3 ? <div className="current-question"><span className="eyebrow">0{answers.length + 1} / 03</span><h3>{questions[answers.length].q}</h3><div className="answer-options">{questions[answers.length].options.map(option => <button type="button" key={option} onClick={() => choose(option)}>{option}<ArrowRight size={15}/></button>)}</div></div> : <div className="onboarding-plan"><span className="eyebrow">{pl ? 'TWÓJ PLAN DEMO' : 'YOUR DEMO PLAN'}</span><h3>{pl ? 'Dobry początek. Jasne granice.' : 'A clear plan. Defined boundaries.'}</h3><ol>{(answers[0] === questions[0].options[2] ? pl ? ['Przygotuj architekturę izolowanego labu.', 'Ustal hosty, porty, konta testowe i warunek STOP.', 'Omów konfigurację. Aktywne testy są w roadmapie.'] : pl ? [`Zaproponuj zakres: ${answers[2] === questions[2].options[0] ? 'package.json' : 'package.json + raport SARIF'}.`, 'Zaczekaj na jawne zatwierdzenie odczytu w CLI.', answers[1] === questions[1].options[2] ? 'Porównaj wyniki i zaznacz luki w dowodach.' : 'Przejrzyj wyniki, poprawkę i pokrycie retestu.'] : ['Plan an isolated lab architecture.', 'Define hosts, ports, test accounts and a STOP condition.', 'Review configuration. Active tests stay on the roadmap.'] : [`Propose the scope: ${answers[2] === questions[2].options[0] ? 'package.json' : 'package.json + SARIF report'}.`, 'Wait for explicit read approval in the CLI.', answers[1] === questions[1].options[2] ? 'Compare results and identify gaps in the evidence.' : 'Review findings, remediation and retest coverage.']).map(item => <li key={item}><Check size={14}/>{item}</li>)}</ol><p>{pl ? 'Kliknięcia na stronie nie udzielają dostępu do Twoich plików.' : 'Clicks on this page do not grant access to your files.'}</p><button className="text-button" type="button" onClick={() => { setAnswers([]); requestAnimationFrame(() => output.current?.focus()); }}><RotateCcw size={14}/>{pl ? 'Zmień odpowiedzi' : 'Change answers'}</button></div>}
  </div></div>;
}
