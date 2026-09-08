import { describe, it, expect } from 'vitest';
import { computeLine, computeDocumentTotals, formatCents, toCents, toQuantityMilli } from '@/modules/quotes/calc';

/**
 * Calculateur financier — INVARIANT du Lot 0 (docs/v1/architecture.md §8),
 * porté sans modification. Aucun flottant dans le chemin de calcul : ces
 * tests sont bloquants en CI.
 */

describe('toCents / toQuantityMilli — frontières de saisie', () => {
  it("0,1 + 0,2 : pas d'erreur de flottant possible (tout est entier)", () => {
    // Le piège classique 0.1 + 0.2 !== 0.3 en float JS n'existe plus : ces
    // valeurs sont des ENTIERS de centimes dès la frontière.
    expect(toCents('0,10') + toCents('0,20')).toBe(30);
    expect(toCents('0.10') + toCents('0.20')).toBe(30);
  });

  it('parse les formats français et anglais', () => {
    expect(toCents('19,99')).toBe(1999);
    expect(toCents('19.99')).toBe(1999);
    expect(toCents('100')).toBe(10000);
  });

  it('rejette un montant invalide', () => {
    expect(() => toCents('abc')).toThrow();
    expect(() => toCents('1.999')).toThrow(); // 3 décimales sur un montant
  });

  it('parse une quantité avec jusqu’à 3 décimales', () => {
    expect(toQuantityMilli('1')).toBe(1000);
    expect(toQuantityMilli('1,5')).toBe(1500);
    expect(toQuantityMilli('0.125')).toBe(125);
  });
});

describe('computeLine — une ligne', () => {
  it('quantité × prix, TVA 20 %', () => {
    const line = computeLine({ quantityMilli: 2000, unitPriceCents: 10000, vatRateBp: 2000 });
    expect(line.grossHtCents).toBe(20000); // 2 × 100,00 €
    expect(line.netHtCents).toBe(20000);
    expect(line.vatCents).toBe(4000); // 20 %
    expect(line.totalTtcCents).toBe(24000);
  });

  it('autres taux supportés (5,5 % / 10 % / 0 %)', () => {
    expect(computeLine({ quantityMilli: 1000, unitPriceCents: 10000, vatRateBp: 550 }).vatCents).toBe(550);
    expect(computeLine({ quantityMilli: 1000, unitPriceCents: 10000, vatRateBp: 1000 }).vatCents).toBe(1000);
    expect(computeLine({ quantityMilli: 1000, unitPriceCents: 10000, vatRateBp: 0 }).vatCents).toBe(0);
  });

  it('quantité décimale', () => {
    const line = computeLine({ quantityMilli: 1500, unitPriceCents: 1000, vatRateBp: 2000 }); // 1,5 × 10,00 €
    expect(line.grossHtCents).toBe(1500);
  });

  it('remise (discountBp)', () => {
    const line = computeLine({ quantityMilli: 1000, unitPriceCents: 10000, vatRateBp: 2000, discountBp: 1000 }); // 10 %
    expect(line.grossHtCents).toBe(10000);
    expect(line.discountCents).toBe(1000);
    expect(line.netHtCents).toBe(9000);
    expect(line.vatCents).toBe(1800);
    expect(line.totalTtcCents).toBe(10800);
  });

  it('zéro : quantité ou prix nul -> ligne à zéro, pas d’erreur', () => {
    expect(computeLine({ quantityMilli: 0, unitPriceCents: 10000, vatRateBp: 2000 }).totalTtcCents).toBe(0);
    expect(computeLine({ quantityMilli: 1000, unitPriceCents: 0, vatRateBp: 2000 }).totalTtcCents).toBe(0);
  });

  it('produit un résultat identique à chaque appel (déterminisme, recalcul)', () => {
    const input = { quantityMilli: 3333, unitPriceCents: 1999, vatRateBp: 2000, discountBp: 750 };
    const a = computeLine(input);
    const b = computeLine(input);
    expect(a).toEqual(b);
  });
});

describe('computeLine — arrondi half-up, demi-centimes', () => {
  it('arrondit 0,5 centime vers le haut (half-up)', () => {
    // 1 unité à 0,015 € (1,5 centime) -> gross = 1,5c -> arrondi à 2c (half-up).
    // Exprimé en centimes entiers : unitPriceCents doit être entier, donc on
    // provoque le demi-centime via la quantité : 0,5 × 3c = 1,5c -> 2c.
    const line = computeLine({ quantityMilli: 500, unitPriceCents: 3, vatRateBp: 0 });
    expect(line.grossHtCents).toBe(2);
  });

  it('la remise peut produire un demi-centime, arrondi half-up', () => {
    // Base 5c, remise 50% -> 2,5c -> arrondi à 3c.
    const line = computeLine({ quantityMilli: 1000, unitPriceCents: 5, vatRateBp: 0, discountBp: 5000 });
    expect(line.discountCents).toBe(3);
    expect(line.netHtCents).toBe(2);
  });

  it('la TVA peut produire un demi-centime, arrondi half-up', () => {
    // net = 25c, TVA 5,5% = 1,375c -> arrondi à 1c... vérifions un cas net à 0,5 pile.
    // net = 50c, taux 1% (100bp) = 0,5c -> arrondi à 1c (half-up, s'éloigne de zéro).
    const line = computeLine({ quantityMilli: 1000, unitPriceCents: 50, vatRateBp: 100 });
    expect(line.vatCents).toBe(1);
  });
});

describe('computeDocumentTotals — plusieurs lignes', () => {
  it('somme les lignes déjà arrondies (jamais un recalcul par formule)', () => {
    const l1 = computeLine({ quantityMilli: 1000, unitPriceCents: 10000, vatRateBp: 2000 });
    const l2 = computeLine({ quantityMilli: 2000, unitPriceCents: 5000, vatRateBp: 1000 });
    const totals = computeDocumentTotals([l1, l2]);
    expect(totals.totalHtCents).toBe(l1.netHtCents + l2.netHtCents);
    expect(totals.totalVatCents).toBe(l1.vatCents + l2.vatCents);
    expect(totals.totalTtcCents).toBe(totals.totalHtCents + totals.totalVatCents);
  });

  it('répartit la TVA par taux (obligation de présentation)', () => {
    const l1 = computeLine({ quantityMilli: 1000, unitPriceCents: 10000, vatRateBp: 2000 });
    const l2 = computeLine({ quantityMilli: 1000, unitPriceCents: 10000, vatRateBp: 550 });
    const totals = computeDocumentTotals([l1, l2]);
    expect(totals.vatBreakdown).toEqual([
      { vatRateBp: 550, baseHtCents: 10000, vatCents: 550 },
      { vatRateBp: 2000, baseHtCents: 10000, vatCents: 2000 },
    ]);
  });

  it('un document sans ligne totalise zéro', () => {
    const totals = computeDocumentTotals([]);
    expect(totals).toEqual({ totalHtCents: 0, totalVatCents: 0, totalTtcCents: 0, vatBreakdown: [] });
  });

  it('vingt lignes : arrondis cumulés cohérents, résultat indépendant de l’ordre', () => {
    const lines = Array.from({ length: 20 }, (_, i) =>
      computeLine({ quantityMilli: 1000 + i, unitPriceCents: 333, vatRateBp: 2000 }),
    );
    const totalsInOrder = computeDocumentTotals(lines);
    const totalsReversed = computeDocumentTotals([...lines].reverse());
    // La somme est commutative : l'ordre des lignes ne change pas le total
    // (chaque ligne est déjà arrondie indépendamment — pas d'arrondi cumulatif dépendant de l'ordre).
    expect(totalsReversed.totalHtCents).toBe(totalsInOrder.totalHtCents);
    expect(totalsReversed.totalVatCents).toBe(totalsInOrder.totalVatCents);
  });

  it('valeur limite raisonnable : gros montant reste exact', () => {
    const line = computeLine({ quantityMilli: 1000, unitPriceCents: 99_999_999, vatRateBp: 2000 });
    expect(line.netHtCents).toBe(99_999_999);
    // 99 999 999 × 20 % = 19 999 999,8 -> arrondi half-up à 20 000 000.
    expect(line.vatCents).toBe(20_000_000);
  });
});

describe('formatCents — présentation uniquement', () => {
  it('formate en euros français, jamais reconverti', () => {
    const formatted = formatCents(199_999);
    expect(formatted).toContain('999,99');
    expect(typeof formatted).toBe('string');
  });
});
