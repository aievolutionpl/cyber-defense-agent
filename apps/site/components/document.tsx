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
import '@/app/mission-workbench.css';
import { SITE_URL, type Locale } from '@/lib/config';

export function pageMetadata(locale: Locale): Metadata {
  const pl = locale === 'pl';
  const title = pl ? 'Cyber Defense Agent | Polski skill bezpieczeństwa dla agentów AI — AI Evolution Polska' : 'Cyber Defense Agent | AI Security Skill by AI Evolution Polska';
  const description = pl ? 'Przegląd kodu, agentów AI, skilli i konfiguracji. Zatwierdzony zakres, konkretne dowody, plan naprawy i retest. Lokalny CLI oraz skill od AI Evolution Polska.' : 'Review code, AI agents, skills and configuration. Approved scope, concrete evidence, a repair plan and retesting. Local CLI and open-source skill by AI Evolution Polska.';
  return {
    ...(SITE_URL ? { metadataBase: new URL(SITE_URL), alternates: { canonical: pl ? './' : 'en/', languages: { pl: './', en: 'en/' } } } : {}),
    title, description, robots: { index: true, follow: true },
    openGraph: { title, description, type: 'website', locale: pl ? 'pl_PL' : 'en_GB' },
  };
}
export function Document({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  return <html lang={locale}><body>{children}</body></html>;
}
