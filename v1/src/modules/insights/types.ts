/**
 * Structure d'un insight — inspirée du moteur V0 (js/insights-engine.js),
 * mêmes principes (fonctions pures, déterministe, testable sans DOM/DB),
 * mais réécrite pour la V1 : pas de copie aveugle des règles/données V0
 * (docs/v1/lot-2-clients-dashboard.md §Insights).
 */
export type InsightType = 'alert' | 'priority' | 'opportunity' | 'info';
export type InsightPriority = 'critical' | 'high' | 'normal';

export type Insight = {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  entityType: 'client' | 'task' | 'quote' | 'invoice';
  entityId: string;
};

/** Données minimales dont les règles ont besoin — pas les modèles Prisma complets. */
export type InsightClient = {
  id: string;
  name: string;
  status: 'prospect' | 'active' | 'to_follow_up' | 'inactive' | 'loyal';
  lastContactAt: Date | null;
  archivedAt: Date | null;
};

export type InsightTask = {
  id: string;
  title: string;
  clientId: string | null;
  clientName: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
};

export type InsightQuote = {
  id: string;
  number: string | null;
  clientId: string;
  clientName: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  issuedAt: Date | null;
  validUntil: Date | null;
  totalTtcCents: number;
};

export type InsightInvoice = {
  id: string;
  number: string | null;
  clientId: string;
  clientName: string;
  status: 'draft' | 'issued';
  issuedAt: Date | null;
  dueDate: Date;
  totalTtcCents: number;
  /** Montant payé actif (déjà agrégé — voir modules/invoices/paymentStatus.ts) */
  paidCents: number;
};

export type InsightContext = {
  /** Date de référence pour "aujourd'hui" — toujours injectable (tests, fuseau). */
  today: Date;
  clients: InsightClient[];
  tasks: InsightTask[];
  quotes: InsightQuote[];
  invoices: InsightInvoice[];
  /** Organization.clientFollowUpDays — voir prisma/schema.prisma. */
  clientFollowUpDays: number;
  /** Organization.quoteFollowUpDays / quoteHighValueCents — voir prisma/schema.prisma. */
  quoteFollowUpDays: number;
  quoteHighValueCents: number;
};
