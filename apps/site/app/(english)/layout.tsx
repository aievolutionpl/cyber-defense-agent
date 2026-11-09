import type { Metadata } from 'next';
import { Document, pageMetadata } from '@/components/document';
export const metadata: Metadata = pageMetadata('en');
export default function Layout({ children }: { children: React.ReactNode }) { return <Document locale="en">{children}</Document>; }
