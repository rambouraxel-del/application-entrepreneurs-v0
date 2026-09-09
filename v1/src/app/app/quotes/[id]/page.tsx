import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { getQuote } from '@/modules/quotes/service';
import {
  addLineAction,
  updateLineAction,
  removeLineAction,
  emitQuoteAction,
  acceptQuoteAction,
  rejectQuoteAction,
  expireQuoteAction,
  deleteDraftQuoteAction,
  regeneratePdfAction,
} from '@/modules/quotes/actions';
import { QuoteLineForm } from '@/modules/quotes/QuoteLineForm';
import { createInvoiceFromQuoteAction } from '@/modules/invoices/actions';
import { formatCents } from '@/lib/billing/calc';
import { QUOTE_STATUS_LABELS, VAT_RATE_LABELS } from '@/modules/quotes/validation';
import { QUOTE_STATUS_TONE } from '@/modules/quotes/presentation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

/**
 * Fiche Devis (Lot 3) : numéro/statut, client, dates, lignes, totaux,
 * actions selon statut. Pas de "Transformer en facture" — réservé au Lot 4
 * (docs/v1/lot-3-devis.md §25) : aucun bouton "à venir" affiché.
 */
export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenantContext();
  const quote = await getQuote(ctx, id);
  if (!quote) notFound();

  const isDraft = quote.status === 'draft';
  const isSent = quote.status === 'sent';
  const isAccepted = quote.status === 'accepted';

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/app/quotes" className="text-sm text-indigo-600 hover:underline">
          ← Retour aux devis
        </Link>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-slate-900">{quote.number ?? 'Brouillon'}</h1>
          <Badge tone={QUOTE_STATUS_TONE[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Badge>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Client</dt>
            <dd className="text-slate-900">
              <Link href={`/app/clients/${quote.client.id}`} className="text-indigo-600 hover:underline">
                {quote.client.name}
              </Link>
            </dd>
          </div>
          {quote.issuedAt && (
            <div>
              <dt className="text-slate-500">Émis le</dt>
              <dd className="text-slate-900">{quote.issuedAt.toLocaleDateString('fr-FR')}</dd>
            </div>
          )}
          {quote.validUntil && (
            <div>
              <dt className="text-slate-500">Valable jusqu&apos;au</dt>
              <dd className="text-slate-900">{quote.validUntil.toLocaleDateString('fr-FR')}</dd>
            </div>
          )}
        </dl>
        {quote.notes && (
          <div className="mt-4">
            <p className="text-sm text-slate-500">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{quote.notes}</p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {isDraft && (
            <>
              <form action={emitQuoteAction.bind(null, quote.id)}>
                <Button type="submit" disabled={quote.lines.length === 0}>
                  Émettre le devis
                </Button>
              </form>
              <form action={deleteDraftQuoteAction.bind(null, quote.id)}>
                <Button type="submit" variant="danger">
                  Supprimer le brouillon
                </Button>
              </form>
            </>
          )}
          {isSent && (
            <>
              <form action={acceptQuoteAction.bind(null, quote.id)}>
                <Button type="submit">Marquer accepté</Button>
              </form>
              <form action={rejectQuoteAction.bind(null, quote.id)}>
                <Button type="submit" variant="secondary">
                  Marquer refusé
                </Button>
              </form>
              <form action={expireQuoteAction.bind(null, quote.id)}>
                <Button type="submit" variant="ghost">
                  Marquer expiré
                </Button>
              </form>
            </>
          )}
          {isAccepted && (
            quote.invoice ? (
              <Link href={`/app/invoices/${quote.invoice.id}`}>
                <Button type="button" variant="secondary">
                  Voir la facture
                </Button>
              </Link>
            ) : (
              <form action={createInvoiceFromQuoteAction.bind(null, quote.id)}>
                <Button type="submit">Créer la facture</Button>
              </form>
            )
          )}
          {quote.pdfPath ? (
            <a href={`/app/quotes/${quote.id}/pdf`} target="_blank" rel="noreferrer">
              <Button type="button" variant="secondary">
                Télécharger le PDF
              </Button>
            </a>
          ) : (
            !isDraft && (
              <form action={regeneratePdfAction.bind(null, quote.id)}>
                <Button type="submit" variant="secondary">
                  Générer le PDF
                </Button>
              </form>
            )
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Lignes</h2>

        {quote.lines.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucune ligne pour le moment.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {quote.lines.map((line) => (
              <li key={line.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{line.description}</p>
                    <p className="text-sm text-slate-500">
                      {(line.quantityMilli / 1000).toLocaleString('fr-FR')}
                      {line.unit ? ` ${line.unit}` : ''} × {formatCents(line.unitPriceCents)} · TVA{' '}
                      {VAT_RATE_LABELS[line.vatRateBp] ?? `${line.vatRateBp / 100} %`}
                      {line.discountBp > 0 ? ` · remise ${(line.discountBp / 100).toLocaleString('fr-FR')} %` : ''}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900">{formatCents(line.totalTtcCents)}</p>
                </div>
                {isDraft && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <details className="flex-1">
                      <summary className="cursor-pointer text-sm font-medium text-indigo-600">Modifier</summary>
                      <div className="mt-3">
                        <QuoteLineForm
                          action={updateLineAction.bind(null, quote.id, line.id)}
                          submitLabel="Enregistrer"
                          compact
                          defaultValues={{
                            description: line.description,
                            unit: line.unit,
                            quantity: String(line.quantityMilli / 1000),
                            unitPrice: (line.unitPriceCents / 100).toFixed(2),
                            vatRateBp: line.vatRateBp,
                            discountPercent: line.discountBp > 0 ? String(line.discountBp / 100) : '',
                          }}
                        />
                      </div>
                    </details>
                    <form action={removeLineAction.bind(null, quote.id, line.id)}>
                      <Button type="submit" variant="danger" className="text-xs">
                        Supprimer
                      </Button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {isDraft && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Ajouter une ligne</h3>
            <QuoteLineForm action={addLineAction.bind(null, quote.id)} submitLabel="Ajouter" />
          </div>
        )}

        <div className="mt-6 space-y-1 border-t border-slate-200 pt-4 text-right text-sm">
          <p>Total HT : {formatCents(quote.totalHtCents)}</p>
          {(quote.vatBreakdown as Array<{ vatRateBp: number; vatCents: number }>).map((v) => (
            <p key={v.vatRateBp} className="text-slate-500">
              dont TVA {(v.vatRateBp / 100).toLocaleString('fr-FR')} % : {formatCents(v.vatCents)}
            </p>
          ))}
          <p className="text-lg font-bold text-slate-900">Total TTC : {formatCents(quote.totalTtcCents)}</p>
        </div>
      </Card>
    </div>
  );
}
