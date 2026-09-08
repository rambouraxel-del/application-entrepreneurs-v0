/**
 * Convention de dates/fuseau — Cockpit Entrepreneur vise d'abord la France.
 *
 * Un piège classique : comparer des dates "naïvement" en UTC déplace "aujourd'hui"
 * de plusieurs heures selon l'heure de la requête (ex. minuit UTC = 1h ou 2h du
 * matin à Paris). Toute règle qui parle d'"aujourd'hui" ou "en retard" doit
 * passer par `todayInTimezone()` plutôt que `new Date()`.
 *
 * `Task.dueDate` est stocké en `@db.Date` (pas d'heure) : Prisma le représente
 * comme un `Date` à minuit UTC. `todayInTimezone()` produit la même forme
 * (minuit UTC du jour civil dans le fuseau donné) pour rester directement
 * comparable — voir docs/v1/lot-2-clients-dashboard.md §Timezone.
 */
export const DEFAULT_TIMEZONE = 'Europe/Paris';

/** "Aujourd'hui" dans le fuseau donné, normalisé à minuit UTC (comparable à `@db.Date`). */
export function todayInTimezone(timeZone: string = DEFAULT_TIMEZONE, reference: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return new Date(Date.UTC(Number(get('year')), Number(get('month')) - 1, Number(get('day'))));
}

/** Nombre de jours (entier) entre deux dates, `to - from`. Positif si `to` est après `from`. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
