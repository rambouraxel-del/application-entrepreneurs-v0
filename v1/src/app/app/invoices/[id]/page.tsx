import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { getInvoice } from '@/modules/invoices/service';
import { getOrganization } from '@/modules/organizations/service';
import { getClient } from '@/modules/clients/service';
import { checkInvoiceIssuerReadiness, checkClientBillingReadiness } from '@/modules/invoices/readiness';
import {
  addInvoiceLineAction,
  updateInvoiceLineAction,
  removeInvoiceLineAction,
  emitInvoiceAction,
  deleteDraftInvoiceAction,
  regenerateInvoicePdfAction,
} from '@/modules/invoices/actions';
import { InvoiceLineForm } from '@/modules/invoices/InvoiceLineForm';
import { formatCents } from '@/lib/billing/calc';
import { VAT_RATE_LABELS } from '@/modules/invoices/validation';
import { INVOICE_STATUS_TONE, PAYMENT_STATUS_TONE } from '@/modules/invoices/presentation';
import { derivePaymentStatus, computePaymentAmounts, PAYMENT_STATUS_LABELS } from '@/modules/invoices/paymentStatus';
import { todayInTimezone } from '@/lib/datetime';
import { recordPaymentAction, cancelPaymentAction } from '@/modules/payments/actions';
import { PaymentForm } from '@/modules/payments/PaymentForm';
import { PAYMENT_METHOD_LABELS } from '@/modules/payments/validation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

/**
 * Fiche Facture (Lot 4, §38) : numéro/état documentaire/état de paiement
 * (deux axes distincts), client, devis source, dates, lignes, ventilation
 * TVA, HT/TTC/payé/restant, conditions de paiement, PDF, historique des
 * paiements. Pas de "Annuler" qui modifierait silencieusement une facture
 * émise (§18) — une correction passera par un avoir, hors périmètre Lot 4.
 */
export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenantContext();
  const invoice = await getInvoice(ctx, id);
  if (!invoice) notFound();

  const isDraft = invoice.status === 'draft';
  const today = todayInTimezone();
  const { paidCents, remainingCents } = computePaymentAmounts(invoice.totalTtcCents, invoice.payments);
  const paymentStatus = derivePaymentStatus({
    issuedAt: invoice.issuedAt, dueDate: invoice.dueDate, totalTtcCents: invoice.totalTtcCents, payments: invoice.payments, today,
  });

  let missingIssuer: string[] = [];
  let missingClient: string[] = [];
  if (isDraft) {
    const [organization, client] = await Promise.all([getOrganization(ctx), getClient(ctx, invoice.clientId)]);
    missingIssuer = checkInvoiceIssuerReadiness(organization);
    if (client) missingClient = checkClientBillingReadiness(client);
  }
  const ready = missingIssuer.length === 0 && missingClient.length === 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/app/invoices" className="text-sm text-indigo-600 hover:underline">
          ← Retour aux factures
        </Link>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-slate-900">{invoice.number ?? 'Brouillon'}</h1>
          <div className="flex items-center gap-2">
            <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{isDraft ? 'Brouillon' : 'Émise'}</Badge>
            {paymentStatus && <Badge tone={PAYMENT_STATUS_TONE[paymentStatus]}>{PAYMENT_STATUS_LABELS[paymentStatus]}</Badge>}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Client</dt>
            <dd className="text-slate-900">
              <Link href={`/app/clients/${invoice.client.id}`} className="text-indigo-600 hover:underline">
                {invoice.client.name}
              </Link>
            </dd>
          </div>
          {invoice.sourceQuote && (
            <div>
              <dt className="text-slate-500">Devis d&apos;origine</dt>
              <dd className="text-slate-900">
                <Link href={`/app/quotes/${invoice.sourceQuote.id}`} className="text-indigo-600 hover:underline">
                  {invoice.sourceQuote.number ?? 'Devis'}
                </Link>
              </dd>
            </div>
          )}
          {invoice.issuedAt && (
            <div>
              <dt className="text-slate-500">Émise le</dt>
              <dd className="text-slate-900">{invoice.issuedAt.toLocaleDateString('fr-FR')}</dd>
            </div>
          )}
          <div>
            <dt className="text-slate-500">Échéance</dt>
            <dd className="text-slate-900">{invoice.dueDate.toLocaleDateString('fr-FR')}</dd>
          </div>
        </dl>

        {isDraft && !ready && (
          <div className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {missingIssuer.length > 0 && <p>Organisation — informations manquantes : {missingIssuer.join(', ')} (<Link href="/app/settings" className="underline">Réglages</Link>).</p>}
            {missingClient.length > 0 && <p>Client — informations manquantes : {missingClient.join(', ')} (<Link href={`/app/clients/${invoice.client.id}/edit`} className="underline">fiche client</Link>).</p>}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {isDraft && (
            <>
              <form action={emitInvoiceAction.bind(null, invoice.id)}>
                <Button type="submit" disabled={invoice.lines.length === 0 || !ready}>
                  Émettre la facture
                </Button>
              </form>
              <form action={deleteDraftInvoiceAction.bind(null, invoice.id)}>
                <Button type="submit" variant="danger">
                  Supprimer le brouillon
                </Button>
              </form>
            </>
          )}
          {invoice.pdfPath ? (
            <a href={`/app/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
              <Button type="button" variant="secondary">
                Télécharger le PDF
              </Button>
            </a>
          ) : (
            !isDraft && (
              <form action={regenerateInvoicePdfAction.bind(null, invoice.id)}>
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

        {invoice.lines.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucune ligne pour le moment.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {invoice.lines.map((line) => (
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
                    {line.vatLegalNotice && <p className="text-xs text-slate-400">{line.vatLegalNotice}</p>}
                  </div>
                  <p className="font-semibold text-slate-900">{formatCents(line.totalTtcCents)}</p>
                </div>
                {isDraft && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <details className="flex-1">
                      <summary className="cursor-pointer text-sm font-medium text-indigo-600">Modifier</summary>
                      <div className="mt-3">
                        <InvoiceLineForm
                          action={updateInvoiceLineAction.bind(null, invoice.id, line.id)}
                          submitLabel="Enregistrer"
                          compact
                          defaultValues={{
                            description: line.description,
                            unit: line.unit,
                            quantity: String(line.quantityMilli / 1000),
                            unitPrice: (line.unitPriceCents / 100).toFixed(2),
                            vatRateBp: line.vatRateBp,
                            discountPercent: line.discountBp > 0 ? String(line.discountBp / 100) : '',
                            vatLegalNotice: line.vatLegalNotice,
                          }}
                        />
                      </div>
                    </details>
                    <form action={removeInvoiceLineAction.bind(null, invoice.id, line.id)}>
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
            <InvoiceLineForm action={addInvoiceLineAction.bind(null, invoice.id)} submitLabel="Ajouter" />
          </div>
        )}

        <div className="mt-6 space-y-1 border-t border-slate-200 pt-4 text-right text-sm">
          <p>Total HT : {formatCents(invoice.totalHtCents)}</p>
          {(invoice.vatBreakdown as Array<{ vatRateBp: number; vatCents: number }>).map((v) => (
            <p key={v.vatRateBp} className="text-slate-500">
              dont TVA {(v.vatRateBp / 100).toLocaleString('fr-FR')} % : {formatCents(v.vatCents)}
            </p>
          ))}
          <p className="text-lg font-bold text-slate-900">Total TTC : {formatCents(invoice.totalTtcCents)}</p>
          {!isDraft && (
            <>
              <p className="text-emerald-700">Payé : {formatCents(paidCents)}</p>
              <p className={remainingCents > 0 ? 'font-semibold text-slate-900' : 'text-slate-500'}>
                Restant dû : {formatCents(remainingCents)}
              </p>
            </>
          )}
        </div>
      </Card>

      {!isDraft && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Paiements</h2>

          {invoice.payments.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Aucun paiement enregistré.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200">
              {invoice.payments.map((payment) => (
                <li key={payment.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className={payment.cancelledAt ? 'text-slate-400 line-through' : 'text-slate-900'}>
                      {formatCents(payment.amountCents)} · {PAYMENT_METHOD_LABELS[payment.method]} · {payment.paidAt.toLocaleDateString('fr-FR')}
                    </span>
                    {!payment.cancelledAt && (
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-red-600">Annuler</summary>
                        <form action={cancelPaymentAction.bind(null, invoice.id, payment.id)} className="mt-2 flex items-center gap-2">
                          <input
                            name="reason"
                            required
                            placeholder="Motif d'annulation"
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                          />
                          <Button type="submit" variant="danger" className="text-xs">
                            Confirmer
                          </Button>
                        </form>
                      </details>
                    )}
                  </div>
                  {payment.reference && <p className="text-xs text-slate-500">Réf. {payment.reference}</p>}
                  {payment.cancelledAt && <p className="text-xs text-red-600">Annulé : {payment.cancellationReason}</p>}
                </li>
              ))}
            </ul>
          )}

          {remainingCents > 0 && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Enregistrer un paiement</h3>
              <PaymentForm action={recordPaymentAction.bind(null, invoice.id)} remainingEuros={(remainingCents / 100).toFixed(2)} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
