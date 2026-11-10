"use client";
import { useEffect, useRef, useState } from "react";

/** Presentation only: cursor arrival and part reveal share one timeline. */
export function AgentBuildScroll({ locale = "en" }: { locale?: "en" | "pl" }) {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const toggle = () => setPaused(value => !value);
    window.addEventListener("cda:toggle-motion", toggle);
    return () => window.removeEventListener("cda:toggle-motion", toggle);
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 1000px) and (pointer: fine)");
    const overlay = root.current!;
    const cursors = Array.from(overlay.querySelectorAll<HTMLElement>(".build-cursor"));
    const targets = Array.from(document.querySelectorAll<HTMLElement>("main > section[data-build-section]"));
    const regions = Array.from(document.querySelectorAll<HTMLElement>("[data-motion-region]"));
    const built = new WeakSet<HTMLElement>();
    const fallbacks: number[] = [];
    const visible = new Set<HTMLElement>();
    let raf = 0;
    let current: HTMLElement | null = null;
    let parts: HTMLElement[] = [];
    const clear = (all = false) => {
      cancelAnimationFrame(raf); raf = 0;
      parts.forEach(part => { part.style.removeProperty("opacity"); part.style.removeProperty("transform"); });
      (all ? targets : current ? [current] : []).forEach(target => { delete target.dataset.buildPending; delete target.dataset.buildStage; });
      overlay.dataset.active = "false"; overlay.style.opacity = "0";
      current = null;
    };
    const enabled = () => !paused && !media.matches && !document.hidden;
    const sync = () => {
      document.documentElement.dataset.motion = enabled() ? "running" : "paused";
      window.dispatchEvent(new Event("agent-build:motion"));
      if (!enabled() || !desktop.matches) clear(true);
    };
    sync();
    if (enabled() && desktop.matches) targets.forEach(t => {
      if (t.getBoundingClientRect().top > innerHeight) t.dataset.buildPending = "true";
    });
    const build = (target: HTMLElement) => {
      if (!enabled() || !desktop.matches || built.has(target)) return;
      built.add(target); current = target;
      delete target.dataset.buildPending;
      const containers = Array.from(target.children).flatMap(child => child.classList.contains("section-shell") ? Array.from(child.children) : [child]);
      parts = containers.flatMap(child => child.matches(".missions-grid, .capabilities-grid, .blueprint-composition") ? Array.from(child.children) : [child])
        .filter((el): el is HTMLElement => el instanceof HTMLElement);
      parts.forEach(p => { p.style.opacity = "0"; });
      overlay.dataset.active = "true"; overlay.style.opacity = "1";
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const bounds = target.getBoundingClientRect();
        if (!enabled() || bounds.bottom < 90 || bounds.top > innerHeight || target.contains(document.activeElement)) {
          clear();
          const next = [...visible].find(candidate => !built.has(candidate));
          if (next) build(next);
          return;
        }
        target.dataset.buildStage = elapsed < 350 ? "drafting" : "assembling";
        parts.forEach((part, index) => {
          const arrival = 350 + index * 420;
          const progress = Math.max(0, Math.min(1, (elapsed - arrival) / 450));
          part.style.opacity = String(progress);
          part.style.transform = `translateY(${(1 - progress) * 18}px)`;
        });
        cursors.forEach((cursor, agent) => {
          const index = Math.min(parts.length - 1, Math.max(agent, Math.floor((elapsed - 350) / 420) + agent));
          const rect = parts[index]?.getBoundingClientRect() ?? bounds;
          const arrival = 350 + index * 420;
          const approach = Math.max(0, Math.min(1, (elapsed - arrival + 350) / 350));
          const x = Math.min(innerWidth - 165, Math.max(20, rect.left + 20 + agent * 80));
          const y = Math.min(innerHeight - 65, Math.max(105, rect.top + 20));
          cursor.style.transform = `translate3d(${x + (1 - approach) * 80}px,${y - (1 - approach) * 40}px,0)`;
          cursor.dataset.clicking = elapsed >= arrival && elapsed < arrival + 200 ? "true" : "false";
          cursor.style.opacity = rect.top < innerHeight && rect.bottom > 100 ? "1" : "0";
        });
        if (elapsed < 800 + parts.length * 420) raf = requestAnimationFrame(tick);
        else { clear(); const next = [...visible].find(t => !built.has(t)); if (next) build(next); }
      };
      raf = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const target = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          visible.add(target);
          fallbacks.push(window.setTimeout(() => { delete target.dataset.buildPending; }, 1800));
        } else visible.delete(target);
      });
      if (!current) { const next = [...visible].find(t => !built.has(t)); if (next) build(next); }
    }, { threshold: 0, rootMargin: "-100px 0px -20% 0px" });
    targets.forEach(t => observer.observe(t));
    const regionObserver = new IntersectionObserver(entries => entries.forEach(e => { (e.target as HTMLElement).dataset.inView = String(e.isIntersecting); }));
    regions.forEach(r => regionObserver.observe(r));
    const focus = () => { if (targets.some(t => t.contains(document.activeElement))) clear(true); };
    const resize = () => clear(true);
    media.addEventListener("change", sync); desktop.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    document.addEventListener("focusin", focus);
    window.addEventListener("resize", resize);
    return () => {
      clear(true); fallbacks.forEach(id => clearTimeout(id)); observer.disconnect(); regionObserver.disconnect();
      media.removeEventListener("change", sync); desktop.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync); document.removeEventListener("focusin", focus);
      window.removeEventListener("resize", resize);
      delete document.documentElement.dataset.motion;
    };
  }, [paused]);
  return <div ref={root} className="agent-build-overlay" aria-hidden="true" data-active="false">
    {["Scout", "Builder", "Verifier"].map((name, index) => <div key={name} className={`build-cursor cursor-${index}`}>
      <svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 2v20l5-6 5 9 4-2-5-8h8L2 2Z" fill="currentColor" stroke="#080c18" strokeWidth="1.5" /></svg>
      <span>{name} · {locale === "pl" ? "buduje" : "building"}</span>
    </div>)}
  </div>;
}
