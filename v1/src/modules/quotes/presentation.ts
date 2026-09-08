import type { QuoteStatus } from '../../../generated/prisma/index';

/** Correspondance statut -> ton de badge. */
export const QUOTE_STATUS_TONE: Record<QuoteStatus, 'neutral' | 'success' | 'warning' | 'info' | 'danger'> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'warning',
};
