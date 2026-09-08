import { z } from 'zod';

/**
 * Validation SERVEUR — la seule qui fasse autorité (docs/v1/architecture.md
 * §18). La validation côté formulaire n'est qu'une aide UX ; toute mutation
 * repasse par ces schémas avant d'atteindre le service.
 */
export const clientInputSchema = z.object({
  kind: z.enum(['individual', 'company']).default('individual'),
  name: z.string().trim().min(1, 'Le nom est requis').max(200, 'Le nom est trop long (200 caractères max)'),
  companyName: z
    .string()
    .trim()
    .max(200, "Le nom d'entreprise est trop long (200 caractères max)")
    .optional()
    .transform((v) => (v ? v : undefined)),
  email: z
    .string()
    .trim()
    .email('E-mail invalide')
    .max(320)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),
  phone: z
    .string()
    .trim()
    .max(40, 'Numéro de téléphone trop long')
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

export const clientStatusSchema = z.enum(['prospect', 'active', 'archived']);

/** Rejette explicitement toute tentative d'imposer une organisation depuis le formulaire. */
export const clientFormShouldNotContainOrganizationId = (formData: FormData) => {
  if (formData.get('organizationId') !== null) {
    throw new Error(
      "Champ organizationId reçu depuis un formulaire : l'organisation est toujours dérivée du contexte serveur, jamais du client.",
    );
  }
};
