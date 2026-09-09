import Link from 'next/link';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { listInvoices } from '@/modules/invoices/service';
import { formatCents } from '@/lib/billing/calc';
import { derivePaymentStatus, computePaymentAmounts, PAYMENT_STATUS_LABELS } from '@/modules/invoices/paymentStatus';
import { INVOICE_STATUS_TONE, PAYMENT_STATUS_TONE } from '@/modules/invoices/presentation';
import { todayInTimezone } from '@/lib/datetime';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * Page Factures (Lot 4) : liste, statut documentaire ET statut de paiement
 * (deux axes distincts — §12/§28), montant TTC/payé/restant. Cartes
 * responsives, jamais un tableau desktop compressé sur mobile.
 */
export default async function InvoicesPage() {
  const ctx = await requireTenantContext();
  const invoices = await listInvoices(ctx);
  const today = todayInTimezone();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Factures</h1>
      <p className="text-sm text-slate-500">
        Créées depuis un devis accepté (page Devis). Pas de création manuelle au Lot 4.
      </p>

      {invoices.length === 0 ? (
        <EmptyState title="Aucune facture pour le moment" description="Acceptez un devis puis créez sa facture depuis sa fiche." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {invoices.map((invoice) => {
            const { remainingCents } = computePaymentAmounts(invoice.totalTtcCents, invoice.payments);
            const paymentStatus = derivePaymentStatus({
              issuedAt: invoice.issuedAt, dueDate: invoice.dueDate, totalTtcCents: invoice.totalTtcCents, payments: invoice.payments, today,
            });
            return (
              <li key={invoice.id}>
                <Link href={`/app/invoices/${invoice.id}`}>
                  <Card className="h-full transition-colors hover:border-indigo-300">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-900">{invoice.number ?? 'Brouillon'}</p>
                      <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{invoice.status === 'draft' ? 'Brouillon' : 'Émise'}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{invoice.client.name}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatCents(invoice.totalTtcCents)}</p>
                    {paymentStatus && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge tone={PAYMENT_STATUS_TONE[paymentStatus]}>{PAYMENT_STATUS_LABELS[paymentStatus]}</Badge>
                        {remainingCents > 0 && <span className="text-xs text-slate-500">Restant : {formatCents(remainingCents)}</span>}
                      </div>
                    )}
                    {invoice.issuedAt && (
                      <p className="mt-1 text-xs text-slate-400">Échéance : {invoice.dueDate.toLocaleDateString('fr-FR')}</p>
                    )}
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
