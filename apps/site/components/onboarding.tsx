"use client";
import { useRef, useState } from "react";
import { ArrowRight, Check, RotateCcw, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/config";
import { onboardingPlan } from "@/lib/onboarding-plan";

export function Onboarding({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const [answers, setAnswers] = useState<number[]>([]);
  const output = useRef<HTMLDivElement>(null);
  const questions = pl
    ? [
        {
          q: "Co dziś chronimy?",
          options: [
            "Lokalne repozytorium",
            "Raport JSON / SARIF",
            "Plan izolowanego labu",
            "Mój komputer lub serwer",
            "Moja strona WWW",
          ],
        },
        {
          q: "Co jest najważniejsze?",
          options: [
            "Przegląd przed wydaniem",
            "Uporządkowanie ryzyk",
            "Weryfikacja poprawek",
          ],
        },
        {
          q: "Jakie dane mogę uwzględnić w planie demo?",
          options: ["Tylko package.json", "Manifest i raport SARIF"],
        },
      ]
    : [
        {
          q: "What are we protecting today?",
          options: [
            "A local repository",
            "A JSON / SARIF report",
            "An isolated lab plan",
            "My computer or server",
            "My website",
          ],
        },
        {
          q: "What matters most right now?",
          options: [
            "Review before release",
            "Prioritise the risks",
            "Verify the fixes",
          ],
        },
        {
          q: "Which demo files should the plan include?",
          options: ["Only package.json", "Manifest and SARIF report"],
        },
      ];
  // Machine and website goals replace the file question with the real consent decision.
  if (answers[0] === 3)
    questions[2] = pl
      ? { q: "Co może opuścić komputer?", options: ["Nic. Tylko lokalna lista", "Nazwy i wersje pakietów do OSV.dev"] }
      : { q: "What may leave the machine?", options: ["Nothing. A local list only", "Package names and versions to OSV.dev"] };
  if (answers[0] === 4)
    questions[2] = pl
      ? { q: "Czyja to strona?", options: ["Moja lub przeze mnie administrowana", "Cudza"] }
      : { q: "Whose site is it?", options: ["Mine, or I administer it", "Someone else's"] };
  const choose = (option: number) => {
    setAnswers([...answers, option]);
    requestAnimationFrame(() => output.current?.focus());
  };
  return (
    <div
      className="onboarding"
      data-agent-target="Scout"
      data-agent-label={pl ? "Układanie planu" : "Mapping the plan"}
    >
      <div className="onboarding-title">
        <span className="agent-avatar">
          <ShieldCheck size={20} />
        </span>
        <div>
          <strong>Cyber Guardian</strong>
          <small>
            {pl
              ? "Interaktywne demo · bez połączenia z modelem"
              : "Interactive demo · no model connection"}
          </small>
        </div>
        <span className="demo-tag">DEMO</span>
      </div>
      <div className="conversation" ref={output} tabIndex={-1}>
        <div className="chat-message">
          <span className="mono">AGENT / 00</span>
          <p>
            {pl
              ? "Co chcesz chronić? Trzy krótkie pytania i przygotuję plan: co sprawdzę, czego dotknę i o co zapytam Cię o zgodę."
              : "What do you want to protect? Three quick questions and I’ll prepare a plan: what I check, what I touch and where I ask for your consent."}
          </p>
        </div>
        {answers.map((answer, i) => (
          <div className="answered-question" key={i}>
            <p>{questions[i].q}</p>
            <span>
              <Check size={13} />
              {questions[i].options[answer]}
            </span>
          </div>
        ))}
        {answers.length < 3 ? (
          <div className="current-question">
            <span className="eyebrow">0{answers.length + 1} / 03</span>
            <h3>{questions[answers.length].q}</h3>
            <div className="answer-options">
              {questions[answers.length].options.map((option, index) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => choose(index)}
                >
                  {option}
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="onboarding-plan">
            <span className="eyebrow">
              {pl ? "TWÓJ PLAN DEMO" : "YOUR DEMO PLAN"}
            </span>
            <h3>
              {pl
                ? "Dobry początek. Jasne granice."
                : "A clear plan. Defined boundaries."}
            </h3>
            <ol>
              {onboardingPlan(locale, answers).map((item) => (
                <li key={item}>
                  <Check size={14} />
                  {item}
                </li>
              ))}
            </ol>
            <p>
              {pl
                ? "Kliknięcia na stronie nie udzielają dostępu do Twoich plików."
                : "Clicks on this page do not grant access to your files."}
            </p>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setAnswers([]);
                requestAnimationFrame(() => output.current?.focus());
              }}
            >
              <RotateCcw size={14} />
              {pl ? "Zmień odpowiedzi" : "Change answers"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
