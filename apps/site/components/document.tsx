import type { Metadata } from 'next';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@/app/globals.css';
import '@/app/command-center.css';
import '@/app/defense-story.css';
import '@/app/expert.css';
import '@/app/blueprint.css';
import { SITE_URL, type Locale } from '@/lib/config';

export function pageMetadata(locale: Locale): Metadata {
  const pl = locale === 'pl';
  const title = pl ? 'Cyber Defense Agent | Skill AI do przeglądu bezpieczeństwa' : 'Cyber Defense Agent | An AI skill for security reviews';
  const description = pl ? 'Otwarty skill, który uczy agenta AI sprawdzać komputer, stronę, kod, bazę danych i sieć: znane luki, plan aktualizacji, dowód i retest. Tylko odczyt, zgoda przed każdym krokiem.' : 'An open-source skill that teaches your AI agent to check your computer, website, code, database and network: known vulnerabilities, an update plan, evidence and a retest. Read-only, with consent before every step.';
  return {
    ...(SITE_URL ? { metadataBase: new URL(SITE_URL), alternates: { canonical: pl ? 'pl/' : './', languages: { en: './', pl: 'pl/' } } } : {}),
    title, description, robots: { index: true, follow: true },
    openGraph: { title, description, type: 'website', locale: pl ? 'pl_PL' : 'en_GB' },
  };
}
export function Document({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  return <html lang={locale}><body>{children}</body></html>;
}
