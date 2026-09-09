import type { InvoiceStatus } from '../../../generated/prisma/index';
import type { PaymentStatus } from './paymentStatus';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = { draft: 'Brouillon', issued: 'Émise' };
export const INVOICE_STATUS_TONE: Record<InvoiceStatus, 'neutral' | 'info'> = { draft: 'neutral', issued: 'info' };

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, 'neutral' | 'success' | 'warning' | 'danger'> = {
  unpaid: 'neutral',
  partial: 'warning',
  paid: 'success',
  overdue: 'danger',
};
