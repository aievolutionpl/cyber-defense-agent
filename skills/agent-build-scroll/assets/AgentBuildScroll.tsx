"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribeReduced = (listener: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};
const getReduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));
const between = (min: number, max: number) => min + Math.random() * (max - min);
type Point = { x: number; y: number };
const cubic = (a: Point, b: Point, c: Point, d: Point, t: number): Point => ({
  x:
    (1 - t) ** 3 * a.x +
    3 * (1 - t) ** 2 * t * b.x +
    3 * (1 - t) * t * t * c.x +
    t ** 3 * d.x,
  y:
    (1 - t) ** 3 * a.y +
    3 * (1 - t) ** 2 * t * b.y +
    3 * (1 - t) * t * t * c.y +
    t ** 3 * d.y,
});

/** Visual construction only. Random local paths never click, inspect or edit user data. */
export function AgentBuildScroll({ locale = "en" }: { locale?: "en" | "pl" }) {
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    getReduced,
    () => true,
  );
  const overlay = useRef<HTMLDivElement>(null);
  const pl = locale === "pl";

  useEffect(() => {
    const disabled = paused || reduced;
    document.documentElement.dataset.motion = disabled ? "paused" : "running";
    window.dispatchEvent(new Event("agent-build:motion"));
    if (disabled || !overlay.current) return;
    const layer = overlay.current;
    const cursors = Array.from(
      layer.querySelectorAll<HTMLElement>(".build-cursor"),
    );
    const frame = layer.querySelector<HTMLElement>(".build-outline")!;
    const caption = layer.querySelector<HTMLElement>(".build-caption")!;
    const blueprints = Array.from(
      layer.querySelectorAll<HTMLElement>(".blueprint-line"),
    );
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-agent-target]"),
    );
    const regions = Array.from(
      document.querySelectorAll<HTMLElement>("[data-motion-region]"),
    );
    const active = new Set<HTMLElement>();
    const builtAt = new WeakMap<HTMLElement, number>();
    let raf = 0,
      current: HTMLElement | null = null,
      lastScroll = window.scrollY;
    let animations: Animation[] = [];
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      animations.forEach((animation) => animation.cancel());
      animations = [];
      layer.dataset.active = "false";
      layer.style.opacity = "0";
      if (current) current.dataset.buildStage = "assembled";
    };
    const build = (target: HTMLElement) => {
      if (document.hidden || target.contains(document.activeElement)) return;
      stop();
      current = target;
      const compact =
        window.matchMedia("(pointer: coarse)").matches || innerWidth < 700;
      const duration = compact ? 1200 : between(2200, 2800);
      const started = performance.now();
      builtAt.set(target, started);
      target.dataset.buildStage = "drafting";
      layer.dataset.active = "true";
      caption.textContent =
        target.dataset.agentLabel ?? "Building the next section";
      const parts = Array.from(target.children)
        .filter(
          (el): el is HTMLElement =>
            el instanceof HTMLElement &&
            !["SCRIPT", "STYLE"].includes(el.tagName),
        )
        .slice(0, 6);
      // All content is readable by default. Effects are temporary and cancelled on focus/pause.
      if (!compact)
        animations = parts.map((part, index) =>
          part.animate(
            [
              { opacity: 0.35, transform: "translateY(9px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 680,
              delay: 120 + index * 100,
              easing: "cubic-bezier(.2,.8,.2,1)",
            },
          ),
        );
      const paths = cursors.map((_, i) => {
        const start = { x: between(0.06, 0.94), y: between(0.05, 0.95) };
        const end = { x: between(0.12, 0.88), y: between(0.16, 0.84) };
        return {
          start,
          end,
          bend1: { x: between(0.04, 0.96), y: between(0.02, 0.8) },
          bend2: { x: between(0.1, 0.9), y: between(0.2, 0.98) },
          delay: i * between(70, 150),
          pace: between(0.72, 1),
          pause: between(0.35, 0.58),
        };
      });
      const tick = (now: number) => {
        const progress = clamp((now - started) / duration, 0, 1);
        const r = target.getBoundingClientRect();
        const x = Math.max(12, r.left - 6),
          y = Math.max(86, r.top - 6);
        const w = Math.min(r.right + 6, innerWidth - 12) - x,
          h = Math.min(r.bottom + 6, innerHeight - 70) - y;
        if (w < 35 || h < 35 || document.hidden) {
          stop();
          return;
        }
        frame.style.transform = `translate3d(${x}px,${y}px,0)`;
        frame.style.width = `${w}px`;
        frame.style.height = `${h}px`;
        frame.style.opacity = String(
          Math.min(1, progress * 7) * Math.min(1, (1 - progress) * 5),
        );
        frame.dataset.phase =
          progress < 0.32 ? "layout" : progress < 0.7 ? "content" : "verified";
        target.dataset.buildStage =
          progress < 0.32
            ? "drafting"
            : progress < 0.8
              ? "assembling"
              : "assembled";
        blueprints.forEach((line, i) => {
          const rect = parts[i]?.getBoundingClientRect();
          line.hidden = !rect || compact;
          if (!rect) return;
          line.style.transform = `translate3d(${clamp(rect.left, x, x + w)}px,${clamp(rect.top, y, y + h)}px,0)`;
          line.style.width = `${Math.max(0, Math.min(rect.width, x + w - rect.left))}px`;
          line.style.height = `${Math.max(0, Math.min(rect.height, y + h - rect.top))}px`;
          line.style.opacity = String(
            Math.max(0, 0.65 - progress * (1.3 + i * 0.15)),
          );
        });
        cursors.forEach((cursor, i) => {
          cursor.hidden = compact && i > 0;
          const path = paths[i];
          const raw = clamp(
            (now - started - path.delay) / duration / path.pace,
            0,
            1,
          );
          // Ease, pause briefly over a detail, then continue to another work point.
          const held =
            raw < path.pause
              ? raw
              : raw < path.pause + 0.09
                ? path.pause
                : raw - 0.09;
          const t = clamp(held / 0.91, 0, 1);
          const eased = t * t * (3 - 2 * t);
          const point = cubic(
            path.start,
            path.bend1,
            path.bend2,
            path.end,
            eased,
          );
          const px = clamp(x + w * point.x, 12, innerWidth - 38),
            py = clamp(y + h * point.y, 88, innerHeight - 80);
          cursor.style.transform = `translate3d(${px}px,${py}px,0)`;
          cursor.dataset.side = px > innerWidth - 160 ? "left" : "right";
          cursor.dataset.clicking =
            raw >= path.pause && raw < path.pause + 0.09 ? "true" : "false";
          const label = cursor.querySelector("span")!;
          const action =
            progress < 0.32
              ? pl
                ? "układ"
                : "layout"
              : progress < 0.7
                ? pl
                  ? "składanie"
                  : "building"
                : pl
                  ? "kontrola"
                  : "checking";
          const nextLabel = `${["Scout", "Builder", "Verifier"][i]} · ${action}`;
          if (label.textContent !== nextLabel) label.textContent = nextLabel;
        });
        layer.style.opacity = String(
          Math.min(1, progress * 10) * Math.min(1, (1 - progress) * 7),
        );
        if (progress < 1) raf = requestAnimationFrame(tick);
        else {
          stop();
          const next = [...active].find((candidate) => !builtAt.has(candidate));
          if (next) build(next);
        }
      };
      raf = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          if (entry.isIntersecting) active.add(target);
          else active.delete(target);
        }
        const target = [...active].find((t) => !builtAt.has(t));
        if (target && !raf) build(target);
      },
      { threshold: 0.15, rootMargin: "-12% 0px -14% 0px" },
    );
    targets.forEach((target) => observer.observe(target));
    const regionObserver = new IntersectionObserver((entries) =>
      entries.forEach((entry) => {
        (entry.target as HTMLElement).dataset.inView = entry.isIntersecting
          ? "true"
          : "false";
      }),
    );
    regions.forEach((region) => regionObserver.observe(region));
    const onScroll = () => {
      const downward = scrollY > lastScroll;
      lastScroll = scrollY;
      if (!downward || document.hidden) return;
      const target = [...active]
        .filter((t) => performance.now() - (builtAt.get(t) ?? -Infinity) > 8000)
        .sort(
          (a, b) =>
            Math.abs(a.getBoundingClientRect().top - innerHeight * 0.35) -
            Math.abs(b.getBoundingClientRect().top - innerHeight * 0.35),
        )[0];
      if (
        target &&
        (!raf || (current && current.getBoundingClientRect().bottom < 100))
      )
        build(target);
    };
    const onVisibility = () => {
      document.documentElement.dataset.motion = document.hidden
        ? "paused"
        : "running";
      if (document.hidden) stop();
    };
    const onFocus = () => {
      if (current?.contains(document.activeElement)) stop();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", stop, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("focusin", onFocus);
    return () => {
      stop();
      observer.disconnect();
      regionObserver.disconnect();
      regions.forEach((r) => delete r.dataset.inView);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", stop);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("focusin", onFocus);
      delete document.documentElement.dataset.motion;
    };
  }, [paused, reduced, pl]);

  return (
    <>
      <div
        className="agent-build-overlay"
        ref={overlay}
        aria-hidden="true"
        data-active="false"
      >
        <div className="build-outline">
          <span className="build-caption" />
          <span className="build-phase" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div className="blueprint-line" key={i} />
        ))}
        {["Scout", "Builder", "Verifier"].map((name, i) => (
          <div className={`build-cursor cursor-${i}`} key={name}>
            <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
              <path
                d="M2 2v20l5-6 5 9 4-2-5-8h8L2 2Z"
                fill="currentColor"
                stroke="#080c18"
                strokeWidth="1.5"
              />
            </svg>
            <span>{name}</span>
          </div>
        ))}
      </div>
      <div className="motion-dock">
        <span className="motion-dock-label">
          <span className="status-dot" />
          {pl ? "DEMO / AGENCI BUDUJĄ" : "DEMO / AGENTS BUILDING"}
        </span>
        <button
          type="button"
          disabled={reduced}
          aria-pressed={paused || reduced}
          aria-label={
            pl
              ? paused
                ? "Wznów animacje"
                : "Wstrzymaj animacje"
              : paused
                ? "Resume animations"
                : "Pause animations"
          }
          onClick={() => setPaused(!paused)}
        >
          {reduced
            ? pl
              ? "Ruch ograniczony"
              : "Reduced motion"
            : paused
              ? "▶"
              : "Ⅱ"}
        </button>
      </div>
    </>
  );
}
