"use client";
import { useEffect, useRef } from "react";
import { asset, type Locale } from "@/lib/config";

export function MotionClips({ locale }: { locale: Locale }) {
  const root = useRef<HTMLDivElement>(null);
  const pl = locale === "pl";
  useEffect(() => {
    const videos = Array.from(root.current!.querySelectorAll('video'));
    const visible = new Set<HTMLVideoElement>();
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => videos.forEach(video => {
      if (visible.has(video) && !document.hidden && !query.matches && document.documentElement.dataset.motion === 'running') video.play().catch(() => {});
      else video.pause();
    });
    const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) visible.add(entry.target as HTMLVideoElement); else visible.delete(entry.target as HTMLVideoElement); }); update(); });
    videos.forEach(video => observer.observe(video));
    query.addEventListener('change', update); document.addEventListener('visibilitychange', update); window.addEventListener('agent-build:motion', update);
    return () => { observer.disconnect(); videos.forEach(video => video.pause()); query.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); window.removeEventListener('agent-build:motion', update); };
  }, []);
  return <div ref={root} className="motion-clips">
    {[['shield-cycle', pl ? 'Od alarmu do potwierdzonej poprawki' : 'From alert to verified fix', pl ? 'Sygnał, dowód, Twoja decyzja, retest.' : 'Signal, evidence, your decision, retest.'], ['code-review', pl ? 'Problem ma konkretną lokalizację' : 'Every finding has a location', pl ? 'Agent wskazuje ryzyko i proponuje zmianę. Ty ją wdrażasz.' : 'Your agent identifies risk and proposes a change. You apply it.']].map(([file, title, caption]) => <figure key={file}>
      <video muted loop playsInline preload="none" poster={asset(`/assets/${file}.png`)} aria-label={title}><source src={asset(`/assets/${file}.mp4`)} type="video/mp4" /></video>
      <figcaption><span>{pl ? 'SCHEMAT DZIAŁANIA' : 'WORKFLOW ILLUSTRATION'}</span><h3>{title}</h3><p>{caption}</p><a href={asset(`/assets/${file}.gif`)} download>{pl ? 'Pobierz GIF' : 'Download GIF'}</a></figcaption>
    </figure>)}
  </div>;
}
