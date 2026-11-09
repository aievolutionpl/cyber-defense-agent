import type { Metadata } from 'next';
import { Document, pageMetadata } from '@/components/document';
export const metadata: Metadata = pageMetadata('pl');
export default function Layout({ children }: { children: React.ReactNode }) { return <Document locale="pl">{children}</Document>; }
