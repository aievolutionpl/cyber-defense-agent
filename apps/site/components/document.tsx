import type { Metadata } from 'next';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@/app/globals.css';
import '@/app/command-center.css';
import '@/app/defense-story.css';
import '@/app/expert.css';
import '@/app/blueprint.css';
import '@/app/cinematic-build.css';
import { SITE_URL, type Locale } from '@/lib/config';

export function pageMetadata(locale: Locale): Metadata {
  const pl = locale === 'pl';
  const title = pl ? 'Cyber Defense Agent | Polski skill bezpieczeństwa dla agentów AI — AI Evolution Polska' : 'Cyber Defense Agent | AI Security Skill by AI Evolution Polska';
  const description = pl ? 'Jeden skill zmienia Twojego agenta AI w eksperta bezpieczeństwa. Sprawdza kod, komputer, stronę WWW, bazę danych i sieć. Tylko odczyt, dowód i raport PDF. Projekt AI Evolution Polska.' : 'One open-source skill turns your AI agent into a security expert. Checks your code, computer, website, database and network. Read-only, with evidence and a PDF report. Created by AI Evolution Polska.';
  return {
    ...(SITE_URL ? { metadataBase: new URL(SITE_URL), alternates: { canonical: pl ? './' : 'en/', languages: { pl: './', en: 'en/' } } } : {}),
    title, description, robots: { index: true, follow: true },
    openGraph: { title, description, type: 'website', locale: pl ? 'pl_PL' : 'en_GB' },
  };
}
export function Document({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  return <html lang={locale}><body>{children}</body></html>;
}
