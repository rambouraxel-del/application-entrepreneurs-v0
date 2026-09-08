/**
 * Convention monétaire V1 — INVARIANT du Lot 0 (docs/v1/architecture.md §8),
 * repris SANS MODIFICATION depuis le spike validé (v1-spike/src/money/money.ts) :
 *
 *   * tout montant est un ENTIER de CENTIMES ;
 *   * toute quantité est un ENTIER de MILLIÈMES (3 décimales, ex. 1,5 → 1500) ;
 *   * tout taux (TVA, remise) est un ENTIER de POINTS DE BASE (20 % → 2000) ;
 *   * aucun nombre à virgule flottante n'entre dans le chemin de calcul.
 *
 * Conséquence vérifiée par le spike : aucune bibliothèque décimale n'est
 * nécessaire. En exprimant les trois grandeurs en entiers, tous les calculs se
 * ramènent à de l'arithmétique entière exacte (BigInt en interne).
 *
 * L'ordre d'arrondi reproduit la sémantique validée en V0 (js/app.js,
 * computeLine) : arrondi au centime à chaque étape nommée, jamais un arrondi
 * unique en fin de chaîne. C'est le CALCULATEUR PUR, la seule source de
 * vérité — écran, service, PDF affichent tous le même chiffre parce qu'ils
 * appellent tous ceci, jamais une formule dupliquée.
 */

/** Division entière avec arrondi au plus proche, à la demie on s'éloigne de zéro (half-up). */
function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error('Dénominateur invalide');
  const negative = numerator < 0n;
  const abs = negative ? -numerator : numerator;
  const quotient = (abs * 2n + denominator) / (denominator * 2n);
  return negative ? -quotient : quotient;
}

export type LineInput = {
  /** Quantité en millièmes : 1 → 1000, 1,5 → 1500. */
  quantityMilli: number;
  /** Prix unitaire HT en centimes. */
  unitPriceCents: number;
  /** Taux de TVA en points de base : 20 % → 2000, 5,5 % → 550. */
  vatRateBp: number;
  /** Remise en points de base : 10 % → 1000. */
  discountBp?: number;
};

export type LineAmounts = {
  grossHtCents: number;
  discountCents: number;
  netHtCents: number;
  vatCents: number;
  totalTtcCents: number;
  vatRateBp: number;
};

/** Calcul d'une ligne. Ordre d'arrondi identique à la V0 et au spike Lot 0. */
export function computeLine(line: LineInput): LineAmounts {
  const qty = BigInt(Math.trunc(line.quantityMilli));
  const unit = BigInt(Math.trunc(line.unitPriceCents));
  const vatRate = BigInt(Math.trunc(line.vatRateBp));
  const discountRate = BigInt(Math.trunc(line.discountBp ?? 0));

  const grossHt = divRoundHalfUp(qty * unit, 1000n);
  const discount = divRoundHalfUp(grossHt * discountRate, 10_000n);
  const netHt = grossHt - discount;
  const vat = divRoundHalfUp(netHt * vatRate, 10_000n);

  return {
    grossHtCents: Number(grossHt),
    discountCents: Number(discount),
    netHtCents: Number(netHt),
    vatCents: Number(vat),
    totalTtcCents: Number(netHt + vat),
    vatRateBp: line.vatRateBp,
  };
}

export type DocumentTotals = {
  totalHtCents: number;
  totalVatCents: number;
  totalTtcCents: number;
  /** Récapitulatif par taux — présentation obligatoire sur un document commercial français. */
  vatBreakdown: Array<{ vatRateBp: number; baseHtCents: number; vatCents: number }>;
};

/**
 * Totaux d'un document = SOMME DES LIGNES DÉJÀ ARRONDIES.
 * Jamais un recalcul par une formule au niveau document : c'est ce qui garantit
 * que l'écran, le PDF et la base affichent le même chiffre au centime près.
 */
export function computeDocumentTotals(lines: LineAmounts[]): DocumentTotals {
  const byRate = new Map<number, { baseHtCents: number; vatCents: number }>();
  let totalHt = 0;
  let totalVat = 0;

  for (const line of lines) {
    totalHt += line.netHtCents;
    totalVat += line.vatCents;
    const bucket = byRate.get(line.vatRateBp) ?? { baseHtCents: 0, vatCents: 0 };
    bucket.baseHtCents += line.netHtCents;
    bucket.vatCents += line.vatCents;
    byRate.set(line.vatRateBp, bucket);
  }

  return {
    totalHtCents: totalHt,
    totalVatCents: totalVat,
    totalTtcCents: totalHt + totalVat,
    vatBreakdown: [...byRate.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([vatRateBp, v]) => ({ vatRateBp, ...v })),
  };
}

/** Formatage — présentation uniquement. Une valeur formatée n'est jamais reconvertie. */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** Conversions aux frontières (saisie utilisateur / import) — jamais l'inverse. */
export const toCents = (euros: string): number => {
  const m = euros.trim().replace(',', '.').match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) throw new Error(`Montant invalide : ${euros}`);
  const [, sign, whole, frac = ''] = m;
  const value = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return sign === '-' ? -value : value;
};

export const toQuantityMilli = (input: string): number => {
  const m = input.trim().replace(',', '.').match(/^(\d+)(?:\.(\d{1,3}))?$/);
  if (!m) throw new Error(`Quantité invalide : ${input}`);
  const [, whole, frac = ''] = m;
  return Number(whole) * 1000 + Number(frac.padEnd(3, '0'));
};
