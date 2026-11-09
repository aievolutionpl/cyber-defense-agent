"use client";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Monitor,
  Server,
  ShieldCheck,
} from "lucide-react";
import { github, type Locale } from "@/lib/config";
import { TabBar } from "./ui";

export function ProtectionMap({ locale }: { locale: Locale }) {
  const pl = locale === "pl";
  const [active, setActive] = useState("code");
  const items = pl
    ? [
        {
          id: "code",
          label: "Kod",
          risk: "Zależność wymaga sprawdzenia.",
          body: "Wersja pasuje do lokalnej reguły podatności. Agent pokazuje dowód i proponuje poprawkę. Osiągalność podatnego kodu wymaga osobnej analizy.",
          from: "package.json",
          signal: "CDA-DEP-001",
          action: "Przejrzyj → popraw → retest",
        },
        {
          id: "config",
          label: "Konfiguracja",
          risk: "Skrót w konfiguracji może otworzyć drogę.",
          body: "Wyłączone sprawdzanie TLS, możliwy sekret w kodzie albo eval. Agent wskazuje miejsce i ograniczenia dowodu, zanim zaproponuje następny krok.",
          from: "src/config.ts",
          signal: "CDA-TLS-001",
          action: "Potwierdź kontekst → utwardź",
        },
        {
          id: "updates",
          label: "Aktualizacje",
          risk: "Aktualność wymaga regularnego przeglądu.",
          body: "Przekaż wyeksportowaną listę aktualizacji PC lub serwera. Agent oznaczy brakujące i stare dane oraz przygotuje plan wdrożenia z backupem i rollbackiem.",
          from: "updates.json",
          signal: "OFFLINE UPDATE PLAN",
          action: "Zweryfikuj listę → zaplanuj zmianę",
        },
      ]
    : [
        {
          id: "code",
          label: "Code",
          risk: "A dependency deserves a closer look.",
          body: "A pinned version matches a local vulnerability rule. Your agent surfaces the evidence and a suggested fix. Whether the affected code is reachable needs a separate check.",
          from: "package.json",
          signal: "CDA-DEP-001",
          action: "Review → remediate → retest",
        },
        {
          id: "config",
          label: "Configuration",
          risk: "A shortcut can become an entry point.",
          body: "Disabled TLS checks, a possible hard-coded secret or eval. Your agent points to the location and evidence limits before suggesting the next step.",
          from: "src/config.ts",
          signal: "CDA-TLS-001",
          action: "Confirm context → harden",
        },
        {
          id: "updates",
          label: "Updates",
          risk: "Staying current takes a repeatable process.",
          body: "Supply an exported PC or server update inventory. Your agent flags missing or stale data and drafts a change plan with backup, rollback and verification steps.",
          from: "updates.json",
          signal: "OFFLINE UPDATE PLAN",
          action: "Validate inventory → plan change",
        },
      ];
  const item = items.find((i) => i.id === active)!;
  return (
    <section className="protection-section section-shell" id="protection">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {pl
              ? "ZAMYKAJ MOŻLIWE DROGI ATAKU"
              : "REDUCE AVOIDABLE ATTACK PATHS"}
          </span>
          <h2>
            {pl ? (
              <>
                Małe zaniedbania.
                <br />
                <span>Dużo do stracenia.</span>
              </>
            ) : (
              <>
                Small gaps.
                <br />
                <span>Real exposure.</span>
              </>
            )}
          </h2>
        </div>
        <p>
          {pl
            ? "Samo tworzenie kodu nie wystarczy. Dodaj przegląd bezpieczeństwa do pracy nad każdą zmianą."
            : "Shipping code is only part of the job. Make security review part of the change, not an afterthought."}
        </p>
      </div>
      <div
        className="protection-workbench"
        data-motion-region
        data-agent-target="Architect"
        data-agent-label={
          pl ? "Mapowanie drogi ryzyka" : "Mapping an attack path"
        }
      >
        <div className="protection-controls">
          <TabBar
            prefix="protection"
            tabs={items.map((i) => ({ id: i.id, label: i.label }))}
            value={active}
            onChange={setActive}
            label={pl ? "Obszary ochrony" : "Protection areas"}
          />
          {items.map((panel) => (
          <div
            key={panel.id}
            hidden={active !== panel.id}
            className="protection-explanation"
            id={`protection-panel-${panel.id}`}
            role="tabpanel"
            aria-labelledby={`protection-tab-${panel.id}`}
            tabIndex={0}
          >
            <span className="eyebrow">{panel.signal}</span>
            <h3>{panel.risk}</h3>
            <p>{panel.body}</p>
            <a
              href={github(
                panel.id === "updates"
                  ? "/blob/main/docs/UPDATE_PLANNING.md"
                  : "/blob/main/docs/THREAT_MODEL.md",
              )}
            >
              {pl
                ? "Poznaj zakres i ograniczenia"
                : "Inspect coverage and limits"}
              <ArrowUpRight size={15} />
            </a>
          </div>
          ))}
        </div>
        <div
          className="attack-path"
          aria-label={
            pl
              ? "Demo: źródło, kontrola i plan działania"
              : "Demo: input, review and action plan"
          }
        >
          <span className="demo-tag">DEMO / STATIC DATA</span>
          <div className="path-node source-node">
            <Monitor size={25} />
            <strong>{item.from}</strong>
            <small>{pl ? "Zatwierdzony artefakt" : "Approved artifact"}</small>
          </div>
          <div className="path-wire">
            <span />
            <ArrowRight size={20} />
          </div>
          <div className="path-node defense-node">
            <ShieldCheck size={32} />
            <strong>Cyber Defense</strong>
            <small>
              {pl ? "Odczyt → dowód → decyzja" : "Read → evidence → decision"}
            </small>
          </div>
          <div className="path-wire">
            <span />
            <ArrowRight size={20} />
          </div>
          <div className="path-node output-node">
            <Check size={25} />
            <strong>{pl ? "Twój następny krok" : "Your next move"}</strong>
            <small>{item.action}</small>
          </div>
        </div>
      </div>
      <div
        className="maintenance-band"
        data-agent-target="Maintainer"
        data-agent-label={
          pl ? "Planowanie aktualizacji" : "Planning maintenance"
        }
      >
        <div className="maintenance-icon">
          <Server size={32} />
        </div>
        <div>
          <span className="eyebrow">WINDOWS / LINUX / MACOS</span>
          <h3>
            {pl
              ? "Twój komputer. Twój serwer. Plan aktualizacji."
              : "Your workstation. Your server. An update plan."}
          </h3>
          <p>
            {pl
              ? "Analiza dostarczonego inventory działa lokalnie. Bez automatycznej instalacji, restartów i obietnicy, że jedna lista obejmuje cały system."
              : "Inventory review runs locally. No automatic installation or restarts, and no claim that one list covers the whole system."}
          </p>
        </div>
        <a
          href={github("/blob/main/docs/UPDATE_PLANNING.md")}
          className="button button-secondary"
        >
          {pl ? "Zobacz polecenie" : "See the command"}
          <ArrowUpRight size={16} />
        </a>
      </div>
    </section>
  );
}
