import { z } from 'zod';

export const TASK_PRIORITIES = ['low', 'normal', 'high'] as const;
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export const TASK_PRIORITY_LABELS: Record<(typeof TASK_PRIORITIES)[number], string> = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
};

const emptyToUndefined = (v: string | undefined) => (v ? v : undefined);

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est requis').max(200, 'Le titre est trop long (200 caractères max)'),
  clientId: z
    .string()
    .trim()
    .uuid('Client invalide')
    .optional()
    .or(z.literal(''))
    .transform(emptyToUndefined),
  /** Format date HTML (YYYY-MM-DD). */
  dueDate: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .transform(emptyToUndefined)
    .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), "Date d'échéance invalide")
    .transform((v) => (v ? new Date(v) : undefined)),
  priority: taskPrioritySchema.default('normal'),
});

export type TaskInput = z.infer<typeof taskInputSchema>;

export const taskFormShouldNotContainOrganizationId = (formData: FormData) => {
  if (formData.get('organizationId') !== null) {
    throw new Error(
      "Champ organizationId reçu depuis un formulaire : l'organisation est toujours dérivée du contexte serveur, jamais du client.",
    );
  }
};
