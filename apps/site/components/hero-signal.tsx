"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Lock,
  RotateCcw,
  Terminal,
} from "lucide-react";
import { asset, github, type Locale } from "@/lib/config";

/** A synthetic visual story. It never inspects a device or sends network traffic. */
export function HeroSignal({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const root = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [manual, setManual] = useState(false);
  const [focused, setFocused] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const steps = pl
    ? [
        {
          label: "Zakres",
          title: "Najpierw zatwierdzony zakres.",
          detail: "Odczyt wybranych plików. Bez wykonywania kodu.",
          code: "READ ONLY / 03 FILES",
          node: "Zatwierdzony zakres",
          agent: "Scout",
          agentAction: "Zamyka obwód zatwierdzonych plików",
          hash: "sha256:8f4b…301a",
          xrayFile: "scope.allowlist.json",
          xrayStatus: "BOUNDARY LOCKED",
          xrayLines: [
            { ln: "01", text: '+ allow: "package.json"', tone: "ok" },
            { ln: "02", text: '+ allow: "src/config.ts"', tone: "ok" },
            { ln: "03", text: '✕ deny:  "../private/.env" [BLOCKED]', tone: "blocked" },
          ],
        },
        {
          label: "Skan",
          title: "Sprawdź słabe punkty.",
          detail: "Lokalne reguły analizują tylko zatwierdzone pliki.",
          code: "LOCAL RULES / READ ONLY",
          node: "Analiza w toku",
          agent: "Scout",
          agentAction: "Skanuje AST i manifesty bez egzekucji",
          hash: "sha256:92c1…77e0",
          xrayFile: "package.json · AST & Rules",
          xrayStatus: "INSPECTING 08 RULES",
          xrayLines: [
            { ln: "11", text: '  "name": "acme-payments-api",', tone: "neutral" },
            { ln: "14", text: '→ "lodash": "4.17.20"  [CDA-DEP-001]', tone: "warn" },
            { ln: "19", text: '  "strictTls": true    [CDA-TLS-001 ✓]', tone: "ok" },
          ],
        },
        {
          label: "Znajdź",
          title: "Jeden sygnał. Konkretny dowód.",
          detail: "Demo: lodash 4.17.20 pasuje do lokalnej reguły.",
          code: "P1 / CDA-DEP-001",
          node: "Wykryto problem",
          agent: "Builder",
          agentAction: "Izoluje dowód P1 i redaguje sekrety",
          hash: "sha256:e10a…4b29",
          xrayFile: "package.json:14 · GHSA-35jh",
          xrayStatus: "P1 EVIDENCE ISOLATED",
          xrayLines: [
            { ln: "14", text: '! "lodash": "4.17.20"  // < 4.17.21', tone: "alert" },
            { ln: "E1", text: "  severity: HIGH · confidence: HIGH", tone: "warn" },
            { ln: "E2", text: "  secretValues: [REDACTED_LOCAL]", tone: "neutral" },
          ],
        },
        {
          label: "Popraw",
          title: "Agent proponuje. Ty decydujesz.",
          detail: "Przejrzyj poprawkę. Zmianę wykonujesz poza narzędziem.",
          code: "HUMAN REVIEW / 4.17.21",
          node: "Twoja decyzja",
          agent: "Builder",
          agentAction: "Przygotowuje łatkę do akceptacji człowieka",
          hash: "sha256:4d77…99a2",
          xrayFile: "patch.proposal.diff",
          xrayStatus: "AWAITING HUMAN APPROVAL",
          xrayLines: [
            { ln: "14", text: '- "lodash": "4.17.20"', tone: "alert" },
            { ln: "14", text: '+ "lodash": "4.17.21"', tone: "ok" },
            { ln: "OP", text: "  Apply outside this tool · No auto-write", tone: "neutral" },
          ],
        },
        {
          label: "Retest",
          title: "Poprawka wymaga potwierdzenia.",
          detail: "Demo: świeży dowód i powtórzona lokalna kontrola.",
          code: "DEMO / CONFIRMED_FIXED",
          node: "Retest potwierdzony",
          agent: "Verifier",
          agentAction: "Potwierdza nowy digest i zamyka zgłoszenie",
          hash: "sha256:00f9…verified",
          xrayFile: "retest.report.md",
          xrayStatus: "CONFIRMED_FIXED ✓",
          xrayLines: [
            { ln: "R1", text: "✓ CDA-DEP-001 → confirmed_fixed", tone: "ok" },
            { ln: "R2", text: "✓ Digest match: sha256:00f9…c812", tone: "ok" },
            { ln: "R3", text: "✓ 0 open findings in approved scope", tone: "ok" },
          ],
        },
      ]
    : [
        {
          label: "Scope",
          title: "Approved scope comes first.",
          detail: "Read selected files. Never execute the project.",
          code: "READ ONLY / 03 FILES",
          node: "Approved scope",
          agent: "Scout",
          agentAction: "Locks the approved file perimeter",
          hash: "sha256:8f4b…301a",
          xrayFile: "scope.allowlist.json",
          xrayStatus: "BOUNDARY LOCKED",
          xrayLines: [
            { ln: "01", text: '+ allow: "package.json"', tone: "ok" },
            { ln: "02", text: '+ allow: "src/config.ts"', tone: "ok" },
            { ln: "03", text: '✕ deny:  "../private/.env" [BLOCKED]', tone: "blocked" },
          ],
        },
        {
          label: "Scan",
          title: "Look for weak points.",
          detail: "Local rules inspect only the files you approved.",
          code: "LOCAL RULES / READ ONLY",
          node: "Review in progress",
          agent: "Scout",
          agentAction: "Runs static rules without code execution",
          hash: "sha256:92c1…77e0",
          xrayFile: "package.json · AST & Rules",
          xrayStatus: "INSPECTING 08 RULES",
          xrayLines: [
            { ln: "11", text: '  "name": "acme-payments-api",', tone: "neutral" },
            { ln: "14", text: '→ "lodash": "4.17.20"  [CDA-DEP-001]', tone: "warn" },
            { ln: "19", text: '  "strictTls": true    [CDA-TLS-001 ✓]', tone: "ok" },
          ],
        },
        {
          label: "Find",
          title: "One signal. Concrete evidence.",
          detail: "Demo: lodash 4.17.20 matches a local rule.",
          code: "P1 / CDA-DEP-001",
          node: "Finding detected",
          agent: "Builder",
          agentAction: "Isolates P1 evidence & redacts secrets",
          hash: "sha256:e10a…4b29",
          xrayFile: "package.json:14 · GHSA-35jh",
          xrayStatus: "P1 EVIDENCE ISOLATED",
          xrayLines: [
            { ln: "14", text: '! "lodash": "4.17.20"  // < 4.17.21', tone: "alert" },
            { ln: "E1", text: "  severity: HIGH · confidence: HIGH", tone: "warn" },
            { ln: "E2", text: "  secretValues: [REDACTED_LOCAL]", tone: "neutral" },
          ],
        },
        {
          label: "Fix",
          title: "Your agent proposes. You decide.",
          detail: "Review the suggested fix. Apply it outside this tool.",
          code: "HUMAN REVIEW / 4.17.21",
          node: "Human decision",
          agent: "Builder",
          agentAction: "Stages clean diff for human review",
          hash: "sha256:4d77…99a2",
          xrayFile: "patch.proposal.diff",
          xrayStatus: "AWAITING HUMAN APPROVAL",
          xrayLines: [
            { ln: "14", text: '- "lodash": "4.17.20"', tone: "alert" },
            { ln: "14", text: '+ "lodash": "4.17.21"', tone: "ok" },
            { ln: "OP", text: "  Apply outside this tool · No auto-write", tone: "neutral" },
          ],
        },
        {
          label: "Verify",
          title: "A fix needs fresh evidence.",
          detail: "Demo: a current file and a repeated local check.",
          code: "DEMO / CONFIRMED_FIXED",
          node: "Retest confirmed",
          agent: "Verifier",
          agentAction: "Verifies fresh SHA-256 digest on retest",
          hash: "sha256:00f9…verified",
          xrayFile: "retest.report.md",
          xrayStatus: "CONFIRMED_FIXED ✓",
          xrayLines: [
            { ln: "R1", text: "✓ CDA-DEP-001 → confirmed_fixed", tone: "ok" },
            { ln: "R2", text: "✓ Digest match: sha256:00f9…c812", tone: "ok" },
            { ln: "R3", text: "✓ 0 open findings in approved scope", tone: "ok" },
          ],
        },
      ];

  const nodes = [
    {
      id: "CDA-TLS-001",
      name: pl ? "Węzeł TLS / Config" : "TLS / Config Node",
      file: "src/config.ts",
      pos: "nw",
      status: pl ? "Czysty (Read-Only)" : "Clear (Read-Only)",
      cx: 170,
      cy: 118,
    },
    {
      id: "CDA-DEP-001",
      name: pl ? "Manifest zależności" : "Dependency Manifest",
      file: "package.json:14",
      pos: "ne",
      status:
        step === 2
          ? pl
            ? "Wykryto: lodash 4.17.20"
            : "Finding: lodash 4.17.20"
          : step === 3
            ? pl
              ? "Propozycja: 4.17.21"
              : "Proposed: 4.17.21"
            : step === 4
              ? pl
                ? "Potwierdzono: 4.17.21"
                : "Verified: 4.17.21"
              : pl
                ? "W zakresie (Allowlist)"
                : "In Scope (Allowlist)",
      cx: 430,
      cy: 118,
    },
    {
      id: "CDA-SECRET-001",
      name: pl ? "Ochrona sekretów" : "Secret Guard",
      file: "../private/.env",
      pos: "sw",
      status: pl
        ? "Zablokowano poza zakresem"
        : "Out-of-scope read blocked",
      cx: 170,
      cy: 282,
    },
    {
      id: "CDA-AGENT-001",
      name: pl ? "Kontrakt Agenta / MCP" : "Agent / MCP Contract",
      file: "AGENTS.md · .mcp.json",
      pos: "se",
      status: pl ? "Zweryfikowano Unicode/Perm" : "Unicode/Perm Verified",
      cx: 430,
      cy: 282,
    },
  ];

  // Cursor choreography coordinates inside the 600x400 SVG viewBox per step
  const agentCursorPos = [
    { x: 170, y: 118, role: "Scout" },
    { x: 300, y: 200, role: "Scout" },
    { x: 430, y: 118, role: "Builder" },
    { x: 412, y: 146, role: "Builder" },
    { x: 300, y: 200, role: "Verifier" },
  ][step];

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
          document.documentElement.dataset.motion === "running" &&
          !document.querySelector(
            '[data-build-intro-target][data-build-stage="drafting"], [data-build-intro-target][data-build-stage="assembling"]',
          ) &&
          document.documentElement.dataset.buildIntro !== "pending",
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
      subtree: true,
      attributeFilter: ["data-motion", "data-build-stage", "data-build-intro"],
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
      () => setStep((value) => (value + 1) % 5),
      3400,
    );
    return () => clearInterval(timer);
  }, [running, manual, focused]);

  const currentStep = steps[step];
  const inspectedNode = activeNode !== null ? nodes[activeNode] : null;

  return (
    <div
      ref={root}
      className="hero-signal defense-story"
      data-step={step}
      data-playing={running && !manual && !focused}
      style={
        {
          "--tilt-rx": `${tilt.rx}deg`,
          "--tilt-ry": `${tilt.ry}deg`,
        } as React.CSSProperties
      }
      onPointerMove={(event) => {
        if (!running) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const nx = (event.clientX - rect.left) / rect.width - 0.5;
        const ny = (event.clientY - rect.top) / rect.height - 0.5;
        setTilt({
          rx: Number((-ny * 4.5).toFixed(2)),
          ry: Number((nx * 5.5).toFixed(2)),
        });
      }}
      onPointerLeave={() => {
        setTilt({ rx: 0, ry: 0 });
        setActiveNode(null);
      }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className="story-top">
        <span className="story-status">
          <i /> CYBER DEFENSE
          <em className="story-version-pill">v0.2 CORE</em>
        </span>
        <span className="story-top-meta">
          <b className="story-hash">{currentStep.hash}</b>
          <span>{pl ? "WIZUALIZACJA / DEMO" : "VISUAL SIMULATION / DEMO"}</span>
        </span>
      </div>

      <div className="defense-scene">
        {["scope", "scan", "finding", "patch", "verified"].map(
          (frame, index) => (
            <Image
              key={frame}
              src={asset(`/assets/defense-${frame}.webp`)}
              width={1200}
              height={800}
              priority={index === 0}
              sizes="(max-width: 760px) 100vw, 52vw"
              unoptimized
              className={`story-frame${index === 0 ? " story-frame-base" : ""}`}
              data-active={step === index}
              aria-hidden={step !== index}
              alt={
                step === index
                  ? `${pl ? "Scena demonstracyjna" : "Demonstration scene"} ${index + 1}: ${steps[index].title} ${pl ? "Ten sam rdzeń agenta i cztery moduły infrastruktury." : "The same agent core and four infrastructure modules."}`
                  : ""
              }
            />
          ),
        )}

        {/* Interactive Isometric SVG Circuit & Telemetry Layer */}
        <svg
          className="isometric-vector-stage"
          viewBox="0 0 600 400"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="iso-emerald" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#b8f5d4" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#42b883" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="iso-amber" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffd27d" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="iso-violet" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.35" />
            </linearGradient>
            <radialGradient id="core-pulse-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.38" />
              <stop offset="70%" stopColor="#34d399" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Approved Scope Isometric Perimeter Polygon */}
          <polygon
            className="iso-scope-perimeter"
            points="300,52 528,195 300,342 72,195"
          />

          {/* Out-of-scope blocked intrusion attempt on SW perimeter */}
          <g className="iso-blocked-attempt">
            <line x1="48" y1="312" x2="122" y2="262" />
            <circle cx="122" cy="262" r="5" />
          </g>

          {/* Central AI Core Radar Rings */}
          <ellipse
            className="iso-core-ring ring-outer"
            cx="300"
            cy="202"
            rx="94"
            ry="54"
          />
          <ellipse
            className="iso-core-ring ring-inner"
            cx="300"
            cy="202"
            rx="62"
            ry="36"
          />
          {step === 4 && (
            <ellipse
              className="iso-verified-wave"
              cx="300"
              cy="202"
              rx="115"
              ry="68"
            />
          )}

          {/* Circuit Traces from Core (300,200) to 4 Server Modules */}
          {/* NW Trace: TLS Config */}
          <path
            className="iso-trace-base"
            d="M 255 178 L 205 152 L 170 118"
          />
          <path
            className="iso-trace-pulse trace-nw"
            d="M 255 178 L 205 152 L 170 118"
          />

          {/* NE Trace: Dependency Manifest (Target of Finding/Patch/Verify) */}
          <path
            className="iso-trace-base"
            d="M 345 178 L 395 152 L 430 118"
          />
          <path
            className="iso-trace-pulse trace-ne"
            d="M 345 178 L 395 152 L 430 118"
          />

          {/* SW Trace: Secrets Guard */}
          <path
            className="iso-trace-base"
            d="M 255 224 L 205 252 L 170 282"
          />
          <path
            className="iso-trace-pulse trace-sw"
            d="M 255 224 L 205 252 L 170 282"
          />

          {/* SE Trace: Agent Contract */}
          <path
            className="iso-trace-base"
            d="M 345 224 L 395 252 L 430 282"
          />
          <path
            className="iso-trace-pulse trace-se"
            d="M 345 224 L 395 252 L 430 282"
          />

          {/* Diagnostic Reticle on NE Module during Finding / Patch / Verify */}
          <g
            className="iso-target-reticle"
            transform="translate(430, 118)"
          >
            <ellipse cx="0" cy="0" rx="44" ry="26" />
            <line x1="-52" y1="0" x2="-36" y2="0" />
            <line x1="36" y1="0" x2="52" y2="0" />
            <line x1="0" y1="-32" x2="0" y2="-20" />
            <line x1="0" y1="20" x2="0" y2="32" />
          </g>

          {/* Node Anchor Beacons */}
          {nodes.map((node, index) => (
            <g
              key={node.id}
              className={`iso-node-beacon beacon-${node.pos}${activeNode === index ? " is-hovered" : ""}`}
              transform={`translate(${node.cx}, ${node.cy})`}
            >
              <circle className="beacon-halo" r="14" />
              <circle className="beacon-dot" r="4.5" />
            </g>
          ))}

          {/* Synchronized Choreographed Agent Cursor inside the Scene */}
          <g
            className="iso-scene-cursor"
            style={{
              transform: `translate3d(${agentCursorPos.x}px, ${agentCursorPos.y}px, 0)`,
            }}
          >
            <path
              d="M 0 0 L 0 15 L 4 11 L 8 18 L 11 16 L 7 9 L 13 9 Z"
              fill="#b8f5d4"
              stroke="#07120c"
              strokeWidth="1.4"
            />
            <rect
              x="14"
              y="6"
              width="58"
              height="16"
              rx="4"
              fill="#0b1711ee"
              stroke="#4f7a60"
              strokeWidth="0.9"
            />
            <text
              x="20"
              y="17"
              fill="#d5f7e3"
              fontSize="8.5"
              fontFamily="var(--mono)"
            >
              {agentCursorPos.role}
            </text>
          </g>
        </svg>

        <div className="scene-scan signal-stream" aria-hidden="true" />

        {/* Interactive Node Hotspots for Hover/Focus Inspection */}
        <div className="iso-node-hotspots" aria-hidden="true">
          {nodes.map((node, index) => (
            <button
              key={node.id}
              type="button"
              tabIndex={-1}
              className={`iso-node-chip chip-${node.pos}${activeNode === index ? " is-active" : ""}`}
              onMouseEnter={() => setActiveNode(index)}
              onClick={() =>
                setActiveNode(activeNode === index ? null : index)
              }
            >
              <span className="chip-dot" />
              <span className="chip-code">{node.id}</span>
            </button>
          ))}
        </div>

        {/* Live Code X-Ray HUD Window */}
        <div className="hero-xray-hud" aria-hidden="true">
          <div className="xray-header">
            <span className="xray-title">
              <Terminal size={11} />
              {inspectedNode ? inspectedNode.file : currentStep.xrayFile}
            </span>
            <span className={`xray-badge badge-step-${step}`}>
              {inspectedNode ? inspectedNode.id : currentStep.xrayStatus}
            </span>
          </div>
          <div className="xray-body">
            {inspectedNode ? (
              <div className="xray-node-inspect">
                <strong>{inspectedNode.name}</strong>
                <span>{inspectedNode.status}</span>
              </div>
            ) : (
              currentStep.xrayLines.map((line) => (
                <div
                  key={`${line.ln}-${line.text}`}
                  className={`xray-line tone-${line.tone}`}
                >
                  <span className="xray-ln">{line.ln}</span>
                  <code>{line.text}</code>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status Marker Pill */}
        <div className="scene-marker" aria-hidden="true">
          <span />
          <div>
            <strong>{currentStep.node}</strong>
            <small>
              {currentStep.agent} · {currentStep.agentAction}
            </small>
          </div>
        </div>

        {/* Scope Guard Badge */}
        <div className="scene-guard-pill" aria-hidden="true">
          <Lock size={11} />
          <span>
            {pl
              ? "BLOKADA POZA ZAKRESEM: ../private/.env"
              : "OUT-OF-SCOPE GUARD: ../private/.env BLOCKED"}
          </span>
        </div>

        <span className="scene-coordinate" aria-hidden="true">
          01—05 / EVIDENCE CHAIN
        </span>
      </div>

      <div className="story-console">
        <div className="story-stage-top">
          <div className="story-code-group">
            <code>{currentStep.code}</code>
            <span className="story-agent-badge">
              {currentStep.agent.toUpperCase()} AGENT
            </span>
          </div>
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
          <strong>{currentStep.title}</strong>
          <p>{currentStep.detail}</p>
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
          ? "Grafika koncepcyjna. v0.2 analizuje lokalne pliki (8 reguł + ochrona konfiguracji AI). "
          : "Concept illustration. v0.2 reviews local files (8 rules + AI config guard). "}
        <a href={github("/blob/main/docs/ROADMAP.md")}>
          {pl ? "Skanowanie sieci: roadmapa" : "Network scanning: roadmap"}
          <ArrowUpRight size={10} />
        </a>
      </p>
    </div>
  );
}
