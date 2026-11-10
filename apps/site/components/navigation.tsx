'use client';
import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { asset, github, type Locale } from '@/lib/config';
import { Mark } from './ui';

export function Navigation({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const pl = locale === 'pl';
  const links = [ ['#missions', pl ? 'Co sprawdza' : 'What it checks'], ['#scan', pl ? 'Jak działa' : 'How it works'], ['#report', pl ? 'Raport PDF' : 'PDF report'], ['#control', pl ? 'Twoja kontrola' : 'Your control'], ['#capabilities', pl ? 'Narzędzia' : 'Toolkit'], ['#install', pl ? 'Uruchom u siebie' : 'Get started'] ];
  return <header className="site-header"><div className="nav-shell"><a href="#main" className="brand" aria-label="Cyber Defense Agent"><Mark small/><span>cyber<span className="brand-light">defense</span><small>AGENT / OPEN SOURCE</small></span></a><nav className="desktop-nav" aria-label={pl ? 'Nawigacja główna' : 'Main navigation'}>{links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</nav><div className="nav-actions"><div className="locale-switch" aria-label={pl ? 'Język' : 'Language'}><a href={asset('/')} hrefLang="en" lang="en" aria-current={!pl ? 'page' : undefined}>EN</a><a href={asset('/pl/')} hrefLang="pl" lang="pl" aria-current={pl ? 'page' : undefined}>PL</a></div><a className="nav-github" href={github()}>GitHub<ArrowUpRight size={15} aria-hidden="true"/></a><button className="menu-button" type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={pl ? 'Menu nawigacji' : 'Navigation menu'} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button></div></div><nav id="mobile-menu" className="mobile-nav" hidden={!open} aria-label={pl ? 'Menu mobilne' : 'Mobile menu'} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); document.querySelector<HTMLButtonElement>('.menu-button')?.focus(); } }}>{links.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}<ArrowUpRight size={16}/></a>)}</nav></header>;
}
