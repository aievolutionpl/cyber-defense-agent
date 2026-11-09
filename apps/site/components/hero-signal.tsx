"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { asset, github, type Locale } from "@/lib/config";

/** A synthetic visual story. It never inspects a device or sends network traffic. */
export function HeroSignal({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const root = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [manual, setManual] = useState(false);
  const [focused, setFocused] = useState(false);
  const [running, setRunning] = useState(false);
  const steps = pl
    ? [
        {
          label: "Sprawdź",
          title: "Najpierw zatwierdzony zakres.",
          detail: "Odczyt wybranych plików. Bez wykonywania kodu.",
          code: "READ ONLY / 03 FILES",
          node: "Zatwierdzony zakres",
        },
        {
          label: "Znajdź",
          title: "Jeden sygnał. Konkretny dowód.",
          detail: "Demo: lodash 4.17.20 pasuje do lokalnej reguły.",
          code: "P1 / CDA-DEP-001",
          node: "Wykryto problem",
        },
        {
          label: "Popraw",
          title: "Agent proponuje. Ty decydujesz.",
          detail: "Przejrzyj poprawkę. Zmianę wykonujesz poza narzędziem.",
          code: "HUMAN REVIEW / 4.17.21",
          node: "Twoja decyzja",
        },
        {
          label: "Zweryfikuj",
          title: "Poprawka wymaga potwierdzenia.",
          detail: "Demo: świeży dowód i powtórzona lokalna kontrola.",
          code: "DEMO / CONFIRMED_FIXED",
          node: "Retest potwierdzony",
        },
      ]
    : [
        {
          label: "Inspect",
          title: "Approved scope comes first.",
          detail: "Read selected files. Never execute the project.",
          code: "READ ONLY / 03 FILES",
          node: "Approved scope",
        },
        {
          label: "Find",
          title: "One signal. Concrete evidence.",
          detail: "Demo: lodash 4.17.20 matches a local rule.",
          code: "P1 / CDA-DEP-001",
          node: "Finding detected",
        },
        {
          label: "Fix",
          title: "Your agent proposes. You decide.",
          detail: "Review the suggested fix. Apply it outside this tool.",
          code: "HUMAN REVIEW / 4.17.21",
          node: "Human decision",
        },
        {
          label: "Verify",
          title: "A fix needs fresh evidence.",
          detail: "Demo: a current file and a repeated local check.",
          code: "DEMO / CONFIRMED_FIXED",
          node: "Retest confirmed",
        },
      ];

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let visible = false;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () =>
      setRunning(
        visible &&
          !document.hidden &&
          !query.matches &&
          document.documentElement.dataset.motion === "running",
      );
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0.2 },
    );
    const motion = new MutationObserver(sync);
    observer.observe(element);
    motion.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-motion"],
    });
    document.addEventListener("visibilitychange", sync);
    query.addEventListener("change", sync);
    sync();
    return () => {
      observer.disconnect();
      motion.disconnect();
      document.removeEventListener("visibilitychange", sync);
      query.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!running || manual || focused) return;
    const timer = window.setInterval(
      () => setStep((value) => (value + 1) % 4),
      3800,
    );
    return () => clearInterval(timer);
  }, [running, manual, focused]);

  return (
    <div
      ref={root}
      className="hero-signal defense-story"
      data-step={step}
      data-playing={running && !manual && !focused}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className="story-top">
        <span className="story-status">
          <i /> CYBER DEFENSE
        </span>
        <span>{pl ? "WIZUALIZACJA / DEMO" : "VISUAL SIMULATION / DEMO"}</span>
      </div>
      <div className="defense-scene">
        <Image
          src={asset("/assets/defense-network-emerald.webp")}
          width={1200}
          height={800}
          priority
          sizes="(max-width: 760px) 100vw, 52vw"
          unoptimized
          alt={
            pl
              ? "Ilustracja 3D: zielony rdzeń agenta połączony z grafitowymi modułami infrastruktury; jeden bursztynowy sygnał błędu."
              : "3D illustration: an emerald agent core connected to graphite infrastructure modules, with one amber diagnostic signal."
          }
        />
        <div className="scene-scan signal-stream" aria-hidden="true" />
        <div className="scene-marker" aria-hidden="true">
          <span />
          {steps[step].node}
        </div>
        <span className="scene-coordinate" aria-hidden="true">
          01—04 / EVIDENCE CHAIN
        </span>
      </div>
      <div className="story-console">
        <div className="story-stage-top">
          <code>{steps[step].code}</code>
          <button
            type="button"
            className="story-replay"
            onClick={() => {
              setStep(0);
              setManual(false);
              setFocused(false);
            }}
            aria-label={
              pl ? "Odtwórz sekwencję od początku" : "Replay the sequence"
            }
          >
            <RotateCcw size={14} />
          </button>
        </div>
        <div className="story-message" key={step}>
          <strong>{steps[step].title}</strong>
          <p>{steps[step].detail}</p>
        </div>
        <div
          className="story-steps"
          role="group"
          aria-label={pl ? "Etapy demonstracji" : "Demonstration stages"}
        >
          {steps.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={step === index}
              onClick={() => {
                setStep(index);
                setManual(true);
              }}
            >
              <span>0{index + 1}</span>
              {item.label}
              <i aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <p className="story-disclosure">
        {pl
          ? "Grafika koncepcyjna. v0.1 analizuje lokalne pliki. "
          : "Concept illustration. v0.1 reviews local files. "}
        <a href={github("/blob/main/docs/ROADMAP.md")}>
          {pl ? "Skanowanie sieci: roadmapa" : "Network scanning: roadmap"}
          <ArrowUpRight size={10} />
        </a>
      </p>
    </div>
  );
}
