import type { ClientStatus } from '../../../generated/prisma/index';

/** Correspondance statut -> ton de badge (repris de la palette V0, badge-*). */
export const CLIENT_STATUS_TONE: Record<ClientStatus, 'neutral' | 'success' | 'warning' | 'info'> = {
  prospect: 'neutral',
  active: 'success',
  to_follow_up: 'warning',
  inactive: 'neutral',
  loyal: 'info',
};
