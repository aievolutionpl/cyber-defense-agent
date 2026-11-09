'use client';

import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowUpRight, Check, Copy, GitBranch } from 'lucide-react';
import { github, type Locale } from '@/lib/config';

export function Mark({ small = false }: { small?: boolean }) {
  return <svg className={small ? 'brand-mark small' : 'brand-mark'} viewBox="0 0 40 44" fill="none" aria-hidden="true"><path d="M20 3 35 9v12c0 9-6.5 15.5-15 20C11.5 36.5 5 30 5 21V9L20 3Z" stroke="currentColor" strokeWidth="2"/><path d="m13 21 5 5 10-11" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export function GitHubLink({ children = 'Start on GitHub', className = 'button button-primary', anchor = '' }: { children?: ReactNode; className?: string; anchor?: string }) {
  return <a className={className} href={github(anchor)}><GitBranch size={18} aria-hidden="true"/><span>{children}</span><ArrowUpRight className="outbound" size={17} aria-hidden="true"/></a>;
}

export function TabBar({ prefix, tabs, value, onChange, label }: { prefix: string; tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void; label: string }) {
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next: number;
    if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    onChange(tabs[next].id);
    document.getElementById(`${prefix}-tab-${tabs[next].id}`)?.focus();
  };
  return <div className="tab-list" role="tablist" aria-label={label}>{tabs.map((tab, i) => <button key={tab.id} id={`${prefix}-tab-${tab.id}`} role="tab" type="button" aria-selected={value === tab.id} aria-controls={`${prefix}-panel-${tab.id}`} tabIndex={value === tab.id ? 0 : -1} onKeyDown={e => keyDown(e, i)} onClick={() => onChange(tab.id)}>{tab.label}</button>)}</div>;
}

export function CopyButton({ text, label, locale = 'en' }: { text: string; label: string; locale?: Locale }) {
  const [message, setMessage] = useState('');
  const copied = locale === 'pl' ? 'Skopiowano' : 'Copied';
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setMessage(copied); }
    catch { setMessage(locale === 'pl' ? 'Zaznacz i skopiuj tekst ręcznie' : 'Select and copy the text manually'); }
  };
  return <div className="copy-control"><button type="button" onClick={copy} aria-label={label} className="copy-button">{message === copied ? <Check size={15} aria-hidden="true"/> : <Copy size={15} aria-hidden="true"/>}<span>{message === copied ? copied : locale === 'pl' ? 'Kopiuj' : 'Copy'}</span></button><span className="sr-only" role="status">{message}</span></div>;
}
