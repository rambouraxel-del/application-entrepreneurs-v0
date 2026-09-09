import { z } from 'zod';

/**
 * Validation SERVEUR — la seule qui fasse autorité (docs/v1/architecture.md
 * §18). La validation côté formulaire n'est qu'une aide UX ; toute mutation
 * repasse par ces schémas avant d'atteindre le service.
 */

/** Statuts CRM du Lot 2 — voir prisma/schema.prisma (ClientStatus) pour la justification. */
export const CLIENT_STATUSES = ['prospect', 'active', 'to_follow_up', 'inactive', 'loyal'] as const;
export const clientStatusSchema = z.enum(CLIENT_STATUSES);

export const CLIENT_STATUS_LABELS: Record<(typeof CLIENT_STATUSES)[number], string> = {
  prospect: 'Prospect',
  active: 'Client actif',
  to_follow_up: 'À relancer',
  inactive: 'Inactif',
  loyal: 'Fidèle',
};

const emptyToUndefined = (v: string | undefined) => (v ? v : undefined);

export const clientInputSchema = z.object({
  kind: z.enum(['individual', 'company']).default('individual'),
  name: z.string().trim().min(1, 'Le nom est requis').max(200, 'Le nom est trop long (200 caractères max)'),
  companyName: z
    .string()
    .trim()
    .max(200, "Le nom d'entreprise est trop long (200 caractères max)")
    .optional()
    .transform(emptyToUndefined),
  email: z
    .string()
    .trim()
    .email('E-mail invalide')
    .max(320)
    .optional()
    .or(z.literal(''))
    .transform(emptyToUndefined),
  phone: z
    .string()
    .trim()
    .max(40, 'Numéro de téléphone trop long')
    .optional()
    .transform(emptyToUndefined),
  status: clientStatusSchema.default('prospect'),
  notes: z
    .string()
    .trim()
    .max(2000, 'Notes trop longues (2000 caractères max)')
    .optional()
    .transform(emptyToUndefined),
  /** Reçu au format date HTML (YYYY-MM-DD) depuis le formulaire, converti en Date. */
  lastContactAt: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .transform(emptyToUndefined)
    .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), 'Date de dernier contact invalide')
    .transform((v) => (v ? new Date(v) : undefined)),

  // --- Facturation (Lot 4, §6) — tout optionnel, requis seulement à
  // l'émission d'une facture (assertClientBillingReady). ------------------
  billingLegalName: z.string().trim().max(200).optional().transform(emptyToUndefined),
  billingAddressLine1: z.string().trim().max(200).optional().transform(emptyToUndefined),
  billingAddressLine2: z.string().trim().max(200).optional().transform(emptyToUndefined),
  billingAddressPostalCode: z.string().trim().max(20).optional().transform(emptyToUndefined),
  billingAddressCity: z.string().trim().max(120).optional().transform(emptyToUndefined),
  billingAddressCountry: z.string().trim().max(2).optional().transform(emptyToUndefined),
  billingEmail: z.string().trim().email('E-mail de facturation invalide').max(320).optional().or(z.literal('')).transform(emptyToUndefined),
  siren: z.string().trim().regex(/^\d{9}$/, 'SIREN invalide (9 chiffres)').optional().or(z.literal('')).transform(emptyToUndefined),
  vatNumber: z.string().trim().max(20).optional().transform(emptyToUndefined),
  deliveryAddressLine1: z.string().trim().max(200).optional().transform(emptyToUndefined),
  deliveryAddressLine2: z.string().trim().max(200).optional().transform(emptyToUndefined),
  deliveryAddressPostalCode: z.string().trim().max(20).optional().transform(emptyToUndefined),
  deliveryAddressCity: z.string().trim().max(120).optional().transform(emptyToUndefined),
  deliveryAddressCountry: z.string().trim().max(2).optional().transform(emptyToUndefined),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

/** Rejette explicitement toute tentative d'imposer une organisation depuis le formulaire. */
export const clientFormShouldNotContainOrganizationId = (formData: FormData) => {
  if (formData.get('organizationId') !== null) {
    throw new Error(
      "Champ organizationId reçu depuis un formulaire : l'organisation est toujours dérivée du contexte serveur, jamais du client.",
    );
  }
};
