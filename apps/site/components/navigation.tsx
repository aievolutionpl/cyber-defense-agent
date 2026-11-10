'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { asset, github, type Locale } from '@/lib/config';
import { Mark } from './ui';

export function Navigation({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  useEffect(() => {
    const update = () => setMotionPaused(document.documentElement.dataset.motion !== 'running');
    window.addEventListener('agent-build:motion', update); update();
    return () => window.removeEventListener('agent-build:motion', update);
  }, []);
  const pl = locale === 'pl';
  const links = [
    ['#agents', pl ? 'Agenci' : 'Agents'],
    ['#missions', pl ? 'Co sprawdza' : 'What it checks'],
    ['#scan', pl ? 'Jak działa' : 'How it works'],
    ['#report', pl ? 'Raport PDF' : 'PDF report'],
    ['#control', pl ? 'Bezpieczeństwo' : 'Control'],
    ['#install', pl ? 'Start' : 'Quick start'],
  ];
  return (
    <header className="site-header">
      <div className="nav-shell">
        <a href="#main" className="brand" aria-label="Cyber Defense Agent">
          <Mark small />
          <span>
            cyber<span className="brand-light">defense</span>
            <small>AI EVOLUTION POLSKA</small>
          </span>
        </a>
        <nav className="desktop-nav" aria-label={pl ? 'Nawigacja główna' : 'Main navigation'}>
          {links.map(([href, label]) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </nav>
        <div className="nav-actions">
          <button
            className="motion-toggle"
            type="button"
            aria-pressed={motionPaused}
            onClick={() => window.dispatchEvent(new Event('cda:toggle-motion'))}
          >
            {pl ? (motionPaused ? 'Ruch: wył.' : 'Ruch: wł.') : (motionPaused ? 'Motion: off' : 'Motion: on')}
          </button>
          <div className="locale-switch" aria-label={pl ? 'Język' : 'Language'}>
            <a href={asset('/')} hrefLang="pl" lang="pl" aria-current={pl ? 'page' : undefined}>PL</a>
            <a href={asset('/en/')} hrefLang="en" lang="en" aria-current={!pl ? 'page' : undefined}>EN</a>
          </div>
          <a className="nav-github" href={github()}>
            GitHub
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
          <button
            className="menu-button"
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={pl ? 'Menu nawigacji' : 'Navigation menu'}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      <nav
        id="mobile-menu"
        className="mobile-nav"
        hidden={!open}
        aria-label={pl ? 'Menu mobilne' : 'Mobile menu'}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            setOpen(false);
            document.querySelector<HTMLButtonElement>('.menu-button')?.focus();
          }
        }}
      >
        {links.map(([href, label]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>
            {label}
            <ArrowUpRight size={16} />
          </a>
        ))}
        <button
          className="motion-toggle motion-menu"
          type="button"
          aria-pressed={motionPaused}
          onClick={() => window.dispatchEvent(new Event('cda:toggle-motion'))}
        >
          {pl ? (motionPaused ? 'Wznów animacje' : 'Wstrzymaj animacje') : (motionPaused ? 'Resume animations' : 'Pause animations')}
        </button>
      </nav>
    </header>
  );
}
