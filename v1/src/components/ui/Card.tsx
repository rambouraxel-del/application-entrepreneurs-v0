import type { ReactNode } from 'react';

/** Bloc de base réutilisé partout (Dashboard, fiches, formulaires) — pas de design system étendu au Lot 2. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}>{children}</div>
  );
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-sm font-semibold text-slate-900 ${className}`}>{children}</h2>;
}
