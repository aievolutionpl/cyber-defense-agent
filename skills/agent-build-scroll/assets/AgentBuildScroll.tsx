'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const subscribeReduced = (listener: () => void) => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
};
const getReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Original scroll choreography. Content remains real, readable and interactive. */
export function AgentBuildScroll({ locale = 'en' }: { locale?: 'en' | 'pl' }) {
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, () => true);
  const overlay = useRef<HTMLDivElement>(null);
  const pl = locale === 'pl';

  useEffect(() => {
    const disabled = paused || reduced;
    document.documentElement.dataset.motion = disabled ? 'paused' : 'running';
    window.dispatchEvent(new Event('agent-build:motion'));
    if (disabled || !overlay.current) return;
    const layer = overlay.current;
    const cursors = Array.from(layer.querySelectorAll<HTMLElement>('.build-cursor'));
    const frame = layer.querySelector<HTMLElement>('.build-outline')!;
    const message = layer.querySelector<HTMLElement>('.build-caption')!;
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-agent-target]'));
    const active = new Set<HTMLElement>();
    let raf = 0, lastScroll = -Infinity, current: HTMLElement | null = null;
    let animation: Animation | undefined;

    const stop = () => { cancelAnimationFrame(raf); raf = 0; animation?.cancel(); layer.dataset.active = 'false'; };
    const build = (target: HTMLElement) => {
      stop();
      if (document.hidden) return;
      const compact = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;
      current = target;
      target.dataset.buildStage = 'assembled';
      layer.dataset.active = 'true';
      message.textContent = target.dataset.agentLabel ?? 'Assembling';
      if (!compact) animation = target.animate([{ opacity: 0.65, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' });
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / (compact ? 800 : 1500), 1);
        const r = target.getBoundingClientRect();
        const x = Math.max(12, r.left - 7), y = Math.max(86, r.top - 7);
        const w = Math.min(r.right + 7, window.innerWidth - 12) - x;
        const h = Math.min(r.bottom + 7, window.innerHeight - 18) - y;
        if (w <= 0 || h <= 0) { stop(); return; }
        frame.style.transform = `translate3d(${x}px,${y}px,0)`;
        frame.style.width = `${w}px`; frame.style.height = `${h}px`;
        frame.style.clipPath = `inset(0 ${Math.max(0, 100 - progress * 160)}% 0 0)`;
        cursors.forEach((cursor, i) => {
          cursor.hidden = compact && i > 0;
          const t = Math.min(1, progress * 1.5);
          const positions = [[x + w * t, y], [x + w, y + h * t], [x + w * (1 - t), y + h]];
          const point = positions[i];
          cursor.dataset.side = point[0] > window.innerWidth - 110 ? 'left' : 'right';
          cursor.style.transform = `translate3d(${Math.max(12, Math.min(point[0], window.innerWidth - 28))}px,${Math.max(86, Math.min(point[1], window.innerHeight - 60))}px,0)`;
        });
        layer.style.opacity = progress > 0.8 ? String((1 - progress) * 5) : '1';
        if (progress < 1) raf = requestAnimationFrame(tick); else { raf = 0; layer.dataset.active = 'false'; }
      };
      raf = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) { const target = entry.target as HTMLElement; if (entry.isIntersecting) active.add(target); else active.delete(target); }
      const target = [...active].find(t => !t.dataset.buildStage);
      if (target) build(target);
    }, { threshold: 0.22, rootMargin: '-8% 0px -8% 0px' });
    targets.forEach(target => observer.observe(target));
    const onScroll = () => {
      if (performance.now() - lastScroll < 650 || document.hidden) return;
      lastScroll = performance.now();
      const target = [...active].sort((a, b) => Math.abs(a.getBoundingClientRect().top - innerHeight * .3) - Math.abs(b.getBoundingClientRect().top - innerHeight * .3))[0];
      if (target && (target !== current || !raf)) build(target);
    };
    const onVisibility = () => { if (document.hidden) stop(); else onScroll(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); observer.disconnect(); window.removeEventListener('scroll', onScroll); document.removeEventListener('visibilitychange', onVisibility); delete document.documentElement.dataset.motion; };
  }, [paused, reduced]);

  return <><div className="agent-build-overlay" ref={overlay} aria-hidden="true" data-active="false"><div className="build-outline"><span className="build-caption"/></div>{['Scout', 'Builder', 'Verifier'].map((name, i) => <div className={`build-cursor cursor-${i}`} key={name}><svg width="22" height="26" viewBox="0 0 22 26" fill="none"><path d="M2 2v20l5-6 5 9 4-2-5-8h8L2 2Z" fill="currentColor" stroke="#07100d" strokeWidth="1.5"/></svg><span>{name}</span></div>)}</div><div className="motion-dock"><span className="motion-dock-label"><span className="status-dot"/>{pl ? 'DEMO / AGENCI BUDUJĄ' : 'DEMO / AGENTS BUILDING'}</span><button type="button" disabled={reduced} aria-pressed={paused || reduced} aria-label={pl ? paused ? 'Wznów animacje' : 'Wstrzymaj animacje' : paused ? 'Resume animations' : 'Pause animations'} onClick={() => setPaused(!paused)}>{reduced ? pl ? 'Ruch ograniczony' : 'Reduced motion' : paused ? '▶' : 'Ⅱ'}</button></div></>;
}
