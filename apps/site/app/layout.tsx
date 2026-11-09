import type { Metadata } from 'next';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './globals.css';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: 'Cyber Defense Agent — dowody, priorytety, retest',
  description: 'Sprawdź bezpieczeństwo swojej firmy z agentem AI. Lokalny przegląd kodu i raportów JSON/SARIF w Codex lub Claude Code. Zobacz przykładowy audyt.',
  openGraph: { title: 'Cyber Defense Agent', description: 'Od sygnału do sprawdzonej poprawki. Lokalny audyt z jasno określonym zakresem.', locale: 'pl_PL', type: 'website', url: SITE_URL },
  robots: { index: false, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pl"><body>{children}</body></html>;
}
