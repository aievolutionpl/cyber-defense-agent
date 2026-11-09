'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { GitHubLink, Mark } from './ui';

export function Navigation() {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="header-inner"><a href="#" className="brand" aria-label="Cyber Defense Agent — początek strony"><Mark/><span>cyber defense<span className="brand-second">agent</span></span></a><nav className={`main-nav ${open ? 'is-open' : ''}`} id="main-nav" aria-label="Nawigacja główna"><a href="#jak-to-dziala" onClick={() => setOpen(false)}>Jak to działa</a><a href="#mozliwosci" onClick={() => setOpen(false)}>Możliwości</a><a href="#demo" onClick={() => setOpen(false)}>Demo audytu</a><a href="#instalacja" onClick={() => setOpen(false)}>Instalacja</a></nav><div className="header-actions"><GitHubLink className="header-github">GitHub</GitHubLink><button className="menu-toggle" type="button" aria-label={open ? 'Zamknij nawigację' : 'Otwórz nawigację'} aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>{open ? <X size={22} aria-hidden="true"/> : <Menu size={22} aria-hidden="true"/>}</button></div></div></header>;
}
