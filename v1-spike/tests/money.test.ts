import { describe, it, expect } from 'vitest';
import { computeLine, computeDocumentTotals, formatCents, toCents } from '../src/money/money.js';

/**
 * Validation de la convention monétaire (architecture §8).
 * Destiné à devenir un test BLOQUANT de la CI V1.
 */

describe("Pourquoi les flottants sont proscrits", () => {
  it('le flottant se trompe déjà sur 0,1 + 0,2', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(0.1 + 0.2).toBeCloseTo(0.30000000000000004, 17);
  });

  it('les centimes entiers donnent le résultat exact', () => {
    expect(toCents('0.10') + toCents('0.20')).toBe(30);
  });

  it("l'arrondi naïf de la V0 dérive sur un cas simple de TVA", () => {
    // Reproduction du calcul V0 : Math.round(v * 100) / 100 sur des flottants.
    const naive = Math.round(4.475 * 100) / 100;
    expect(naive).toBe(4.47); // ← attendu commercialement : 4,48
    // Le même calcul en centimes entiers arrondit correctement.
    const { vatCents } = computeLine({ quantityMilli: 1000, unitPriceCents: 2238, vatRateBp: 2000 });
    expect(vatCents).toBe(448); // 22,38 € × 20 % = 4,476 € → 4,48 €
  });
});

describe('Calcul de ligne', () => {
  it('quantité entière × prix unitaire', () => {
    const line = computeLine({ quantityMilli: 3000, unitPriceCents: 25_000, vatRateBp: 2000 });
    expect(line.netHtCents).toBe(75_000);
    expect(line.vatCents).toBe(15_000);
    expect(line.totalTtcCents).toBe(90_000);
  });

  it('quantité décimale (1,5 jour)', () => {
    const line = computeLine({ quantityMilli: 1500, unitPriceCents: 3_333, vatRateBp: 2000 });
    expect(line.grossHtCents).toBe(5_000);   // 1,5 × 33,33 € = 49,995 € → 50,00 €
    expect(line.vatCents).toBe(1_000);
    expect(line.totalTtcCents).toBe(6_000);
  });

  it('remise appliquée avant la TVA', () => {
    const line = computeLine({
      quantityMilli: 1000, unitPriceCents: 180_000, vatRateBp: 2000, discountBp: 1000,
    });
    expect(line.grossHtCents).toBe(180_000);
    expect(line.discountCents).toBe(18_000);
    expect(line.netHtCents).toBe(162_000);
    expect(line.vatCents).toBe(32_400);
    expect(line.totalTtcCents).toBe(194_400);
  });

  it('taux réduits français', () => {
    expect(computeLine({ quantityMilli: 1000, unitPriceCents: 10_000, vatRateBp: 550 }).vatCents).toBe(550);
    expect(computeLine({ quantityMilli: 1000, unitPriceCents: 10_000, vatRateBp: 1000 }).vatCents).toBe(1_000);
  });

  it("arrondit à la demie en s'éloignant de zéro", () => {
    // 0,005 € pile → 0,01 €
    expect(computeLine({ quantityMilli: 1000, unitPriceCents: 100, vatRateBp: 50 }).vatCents).toBe(1);
  });

  it('gère le montant nul', () => {
    const line = computeLine({ quantityMilli: 0, unitPriceCents: 50_000, vatRateBp: 2000 });
    expect(line).toMatchObject({ grossHtCents: 0, netHtCents: 0, vatCents: 0, totalTtcCents: 0 });
  });
});

describe('Totaux de document', () => {
  it('somme les lignes déjà arrondies, sans recalcul global', () => {
    const lines = [
      computeLine({ quantityMilli: 1000, unitPriceCents: 3_333, vatRateBp: 2000 }),
      computeLine({ quantityMilli: 1000, unitPriceCents: 3_333, vatRateBp: 2000 }),
      computeLine({ quantityMilli: 1000, unitPriceCents: 3_333, vatRateBp: 2000 }),
    ];
    const totals = computeDocumentTotals(lines);
    expect(totals.totalHtCents).toBe(9_999);
    expect(totals.totalVatCents).toBe(3 * 667);           // 666,6 → 667 par ligne
    expect(totals.totalTtcCents).toBe(9_999 + 2_001);
    // Un recalcul global (9 999 × 20 %) donnerait 2 000 : l'écart d'un centime
    // est exactement ce que la règle « somme des lignes » évite d'introduire
    // entre l'écran, le PDF et la base.
    expect(totals.totalVatCents).not.toBe(Math.round(9_999 * 0.2));
  });

  it('récapitule la TVA par taux', () => {
    const totals = computeDocumentTotals([
      computeLine({ quantityMilli: 1000, unitPriceCents: 100_000, vatRateBp: 2000 }),
      computeLine({ quantityMilli: 1000, unitPriceCents: 50_000, vatRateBp: 550 }),
      computeLine({ quantityMilli: 2000, unitPriceCents: 10_000, vatRateBp: 2000 }),
    ]);
    expect(totals.vatBreakdown).toEqual([
      { vatRateBp: 550, baseHtCents: 50_000, vatCents: 2_750 },
      { vatRateBp: 2000, baseHtCents: 120_000, vatCents: 24_000 },
    ]);
  });

  it('cumule 100 lignes sans dérive', () => {
    const lines = Array.from({ length: 100 }, () =>
      computeLine({ quantityMilli: 1000, unitPriceCents: 1_999, vatRateBp: 2000 }),
    );
    const totals = computeDocumentTotals(lines);
    expect(totals.totalHtCents).toBe(199_900);
    expect(totals.totalVatCents).toBe(100 * 400);
    expect(Number.isInteger(totals.totalTtcCents)).toBe(true);
  });
});

describe('Frontières de conversion et de formatage', () => {
  it('convertit une saisie utilisateur en centimes', () => {
    expect(toCents('1234.56')).toBe(123_456);
    expect(toCents('1234,56')).toBe(123_456);
    expect(toCents('10')).toBe(1_000);
    expect(toCents('-5.5')).toBe(-550);
    expect(() => toCents('12,345')).toThrow();
    expect(() => toCents('abc')).toThrow();
  });

  it('formate en français sans jamais servir de valeur de calcul', () => {
    expect(formatCents(324_000).replace(/ | /g, ' ')).toBe('3 240,00 €');
  });
});
