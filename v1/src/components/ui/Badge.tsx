import type { ReactNode } from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'info' | 'danger';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  info: 'bg-indigo-100 text-indigo-800',
  danger: 'bg-red-100 text-red-800',
};

/** Étiquette de statut. Le texte porte toujours l'information — jamais la couleur seule (accessibilité). */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}
