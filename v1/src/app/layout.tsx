import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cockpit Entrepreneur',
  description: 'Socle V1 — Lot 1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
