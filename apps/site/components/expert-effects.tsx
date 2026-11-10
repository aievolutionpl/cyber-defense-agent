"use client";
import { useEffect } from "react";

/** Progressive polish only: content is fully readable without it (no JS, reduced motion, paused). */
export function ExpertEffects() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const bar = document.querySelector<HTMLElement>(".scroll-progress span");
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const max = root.scrollHeight - innerHeight;
        if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    root.classList.add("reveal-ready");
    const reveal = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          reveal.unobserve(entry.target);
        }),
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => reveal.observe(el));

    const counted = new WeakSet<Element>();
    const counters = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (!entry.isIntersecting || counted.has(el)) return;
          counted.add(el);
          const end = Number(el.dataset.count);
          if (reduced.matches || root.dataset.motion === "paused" || !Number.isFinite(end) || end === 0) return;
          const started = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - started) / 1100);
            el.textContent = String(Math.round(end * (1 - (1 - t) ** 3)));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
      { threshold: 0.6 },
    );
    document.querySelectorAll("[data-count]").forEach((el) => counters.observe(el));

    const spot = (event: PointerEvent) => {
      const card = (event.target as HTMLElement | null)?.closest?.<HTMLElement>("[data-spot]");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };
    addEventListener("pointermove", spot, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("pointermove", spot);
      reveal.disconnect();
      counters.disconnect();
      cancelAnimationFrame(frame);
      root.classList.remove("reveal-ready");
    };
  }, []);
  return (
    <div className="scroll-progress" aria-hidden="true">
      <span />
    </div>
  );
}
