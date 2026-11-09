import type { Metadata } from 'next';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@/app/globals.css';
import '@/app/command-center.css';
import { SITE_URL, type Locale } from '@/lib/config';

export function pageMetadata(locale: Locale): Metadata {
  const pl = locale === 'pl';
  const title = pl ? 'Cyber Defense Agent — znajdź ryzyko, sprawdź poprawkę' : 'Cyber Defense Agent — Find the risk. Prove the fix.';
  const description = pl ? 'Lokalny przegląd kodu, analiza JSON/SARIF i retest. Jeden otwarty skill dla Codex i Claude Code. Poznaj interaktywne demo.' : 'Local code review, JSON/SARIF triage and evidence-based retesting. One open-source skill for Codex and Claude Code. Explore the interactive demo.';
  return {
    ...(SITE_URL ? { metadataBase: new URL(SITE_URL), alternates: { canonical: pl ? 'pl/' : './', languages: { en: './', pl: 'pl/' } } } : {}),
    title, description, robots: { index: true, follow: true },
    openGraph: { title, description, type: 'website', locale: pl ? 'pl_PL' : 'en_GB' },
  };
}
export function Document({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  return <html lang={locale}><body>{children}</body></html>;
}
