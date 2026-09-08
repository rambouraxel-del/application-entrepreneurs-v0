import type { TenantScopedClient } from '@/lib/db/withTenant';

/**
 * Allocation d'un numéro de document — mécanisme validé au Lot 0
 * (docs/v1/lot-0-validation.md §6), porté SANS MODIFICATION.
 *
 * INTERDITS explicites (docs/v1/architecture.md §10) :
 *   - COUNT(*) + 1
 *   - MAX(number) + 1      ← ce que fait la V0, non fiable en concurrence
 *   - lecture puis écriture non verrouillée
 *
 * Mécanisme retenu : une seule instruction atomique.
 *   INSERT ... ON CONFLICT DO UPDATE SET last_value = last_value + 1 RETURNING
 *
 * Deux propriétés en découlent :
 *   - la ligne du compteur est verrouillée pour la durée de la transaction,
 *     donc deux émissions concurrentes sont sérialisées : jamais le même
 *     numéro (testé sous charge réelle, docs/v1/lot-3-devis.md §Numérotation) ;
 *   - l'incrément fait partie de la transaction d'émission : si celle-ci
 *     échoue, le compteur revient en arrière et le numéro est réutilisé par
 *     la suivante → séquence SANS TROU.
 *
 * `docType` est générique ("quote" au Lot 3, "invoice" au Lot 4) : même
 * mécanisme, même table (`document_counters`), pas de nouveau code au Lot 4.
 */
export type CounterKey = { organizationId: string; docType: string; year: number };

export async function allocateSequence(
  db: TenantScopedClient,
  { organizationId, docType, year }: CounterKey,
): Promise<number> {
  const rows = await db.$queryRaw<Array<{ last_value: number }>>`
    INSERT INTO document_counters (organization_id, doc_type, year, last_value)
    VALUES (${organizationId}::uuid, ${docType}, ${year}, 1)
    ON CONFLICT (organization_id, doc_type, year)
    DO UPDATE SET last_value = document_counters.last_value + 1
    RETURNING last_value
  `;
  const value = rows[0]?.last_value;
  if (typeof value !== 'number') {
    // Se produit si la RLS rejette l'écriture : aucun contexte tenant, ou
    // contexte ne correspondant pas à l'organisation demandée.
    throw new Error('Allocation de numéro refusée : contexte tenant absent ou incohérent');
  }
  return value;
}

/**
 * Formatage — strictement séparé de la valeur métier.
 *
 * La logique métier manipule (docType, year, sequence). Elle ne parse JAMAIS
 * la chaîne affichée : le format peut changer sans casser quoi que ce soit.
 */
export type NumberFormat = { prefix: string; includeYear: boolean; padding?: number };

export function formatDocumentNumber(
  { year, sequence }: { year: number; sequence: number },
  format: NumberFormat,
): string {
  const padded = String(sequence).padStart(format.padding ?? 6, '0');
  return format.includeYear ? `${format.prefix}-${year}-${padded}` : `${format.prefix}-${padded}`;
}
