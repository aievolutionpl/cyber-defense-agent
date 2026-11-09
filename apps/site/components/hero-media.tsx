'use client';
import { useEffect, useRef } from 'react';
import { asset } from '@/lib/config';

export function HeroMedia() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current!;
    let visible = true;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = matchMedia('(pointer: coarse)');
    const update = () => {
      if (query.matches || coarse.matches || document.hidden || !visible || document.documentElement.dataset.motion !== 'running') video.pause();
      else video.play().catch(() => { /* Permanent poster is the fallback. */ });
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(video);
    window.addEventListener('agent-build:motion', update);
    document.addEventListener('visibilitychange', update);
    query.addEventListener('change', update); coarse.addEventListener('change', update); update();
    return () => { observer.disconnect(); video.pause(); window.removeEventListener('agent-build:motion', update); document.removeEventListener('visibilitychange', update); query.removeEventListener('change', update); coarse.removeEventListener('change', update); };
  }, []);
  return <div className="hero-media" aria-hidden="true"><video ref={ref} muted loop playsInline preload="none" poster={asset('/assets/defense-core.webp')}><source src={asset('/assets/defense-core-loop.mp4')} type="video/mp4"/></video></div>;
}
