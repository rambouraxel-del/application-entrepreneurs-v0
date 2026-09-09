import Link from 'next/link';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { listQuotes } from '@/modules/quotes/service';
import { formatCents } from '@/lib/billing/calc';
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS } from '@/modules/quotes/validation';
import { QUOTE_STATUS_TONE } from '@/modules/quotes/presentation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import type { QuoteStatus } from '../../../../generated/prisma/index';

/**
 * Page Devis (Lot 3) : liste, filtre par statut, création. Pas de
 * pagination — même choix qu'au Lot 2, volume MVP trop faible. Mobile :
 * cartes empilées, jamais un tableau (docs/v1/lot-3-devis.md §UI).
 */
export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const ctx = await requireTenantContext();
  const status = isQuoteStatus(params.status) ? params.status : undefined;
  const quotes = await listQuotes(ctx, { status });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-slate-900">Devis</h1>
        <Link href="/app/quotes/new">
          <Button>Nouveau devis</Button>
        </Link>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" role="search">
        <label htmlFor="status" className="sr-only">
          Filtrer par statut
        </label>
        <Select id="status" name="status" defaultValue={params.status ?? ''} className="sm:w-56">
          <option value="">Tous les statuts</option>
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {QUOTE_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>

      {quotes.length === 0 ? (
        <EmptyState
          title={params.status ? 'Aucun devis avec ce statut' : 'Aucun devis pour le moment'}
          description={!params.status ? 'Créez votre premier devis pour un client existant.' : undefined}
          action={
            !params.status ? (
              <Link href="/app/quotes/new" className="text-sm font-medium text-indigo-600 hover:underline">
                Nouveau devis
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quotes.map((quote) => (
            <li key={quote.id}>
              <Link href={`/app/quotes/${quote.id}`}>
                <Card className="h-full transition-colors hover:border-indigo-300">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-900">{quote.number ?? 'Brouillon'}</p>
                    <Badge tone={QUOTE_STATUS_TONE[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{quote.client.name}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatCents(quote.totalTtcCents)}</p>
                  {quote.validUntil && (
                    <p className="mt-1 text-xs text-slate-400">
                      Valable jusqu&apos;au {quote.validUntil.toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function isQuoteStatus(value: string | undefined): value is QuoteStatus {
  return !!value && (QUOTE_STATUSES as readonly string[]).includes(value);
}
