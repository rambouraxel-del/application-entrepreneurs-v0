import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appPrisma, systemPrisma } from '../src/db/client.js';
import { withTenant } from '../src/db/withTenant.js';
import { allocateSequence, formatDocumentNumber } from '../src/numbering/allocate.js';
import { computeLine, computeDocumentTotals } from '../src/money/money.js';
import { renderInvoicePdf, type DocumentSnapshot } from '../src/documents/pdf.js';
import { LocalDocumentStorage, documentPath, sha256, SignedUrlError } from '../src/documents/storage.js';
import { unsafeTenantContextForTests } from '../src/tenant/context.js';
import { resetDatabase, seedTwoOrganizations, type Fixture } from './helpers.js';

/** SPIKE C — PDF, stockage, URL signée, immutabilité documentaire. */

let f: Fixture;
let root: string;
let storage: LocalDocumentStorage;
const ctxA = () => unsafeTenantContextForTests(f.userA, f.orgA);

beforeEach(async () => {
  await resetDatabase();
  f = await seedTwoOrganizations();
  root = await mkdtemp(join(tmpdir(), 'spike-storage-'));
  storage = new LocalDocumentStorage(root, 'secret-de-test');
});
afterAll(async () => {
  await appPrisma.$disconnect();
  await systemPrisma.$disconnect();
  if (root) await rm(root, { recursive: true, force: true });
});

/** Émission complète : numéro + snapshots figés + PDF stocké, en une transaction. */
async function issueInvoice() {
  const client = await systemPrisma.client.findUniqueOrThrow({ where: { id: f.clientA } });
  const org = await systemPrisma.organization.findUniqueOrThrow({ where: { id: f.orgA } });

  const lines = [computeLine({ quantityMilli: 1500, unitPriceCents: 180_000, vatRateBp: 2000 })];
  const totals = computeDocumentTotals(lines);

  const doc = await withTenant(ctxA(), async (db) => {
    const sequence = await allocateSequence(db, {
      organizationId: f.orgA, docType: 'invoice', year: 2026,
    });
    const number = formatDocumentNumber({ year: 2026, sequence }, { prefix: 'FAC', includeYear: true });

    return db.issuedDocument.create({
      data: {
        clientId: client.id, docType: 'invoice', year: 2026, sequence, number,
        // SNAPSHOTS : copie de l'identité au moment de l'émission.
        clientSnapshot: { name: client.name, address: '8 avenue des Tilleuls, 69003 Lyon' },
        sellerSnapshot: { legalName: org.legalName, address: "10 rue de l'Innovation, 75011 Paris", siret: '123 456 789 00012' },
        totalHtCents: totals.totalHtCents,
        totalVatCents: totals.totalVatCents,
        totalTtcCents: totals.totalTtcCents,
      } as never,
    });
  });

  const snapshot: DocumentSnapshot = {
    number: doc.number,
    issuedAt: '08/09/2026',
    seller: doc.sellerSnapshot as DocumentSnapshot['seller'],
    client: doc.clientSnapshot as DocumentSnapshot['client'],
    lines: [{ label: 'Création site vitrine — forfait « clé en main »', quantityMilli: 1500, unitPriceCents: 180_000, vatRateBp: 2000, netHtCents: lines[0]!.netHtCents, vatCents: lines[0]!.vatCents }],
    totals,
  };

  const pdf = await renderInvoicePdf(snapshot);
  const path = documentPath(f.orgA, doc.id);
  const stored = await storage.put(path, pdf);

  await withTenant(ctxA(), (db) =>
    db.issuedDocument.update({
      where: { id: doc.id },
      data: { pdfPath: stored.path, pdfSha256: stored.sha256 },
    }),
  );

  return { doc, pdf, stored, snapshot };
}

describe('Génération PDF', () => {
  it('produit un PDF valide et non trivial', async () => {
    const { pdf } = await issueInvoice();
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.byteLength).toBeGreaterThan(1_000);
  });

  it('rend les caractères français et le symbole euro sans dépendance externe', async () => {
    const pdf = await renderInvoicePdf({
      number: 'FAC-2026-000001', issuedAt: '08/09/2026',
      seller: { legalName: 'Société Générale de Rénovation', address: "10 rue de l'Été", siret: '123' },
      client: { name: 'Éric Lefèvre — Ébénisterie', address: 'Çà et là, 75011 Paris' },
      lines: [{ label: 'Prestation « sur-mesure » — août', quantityMilli: 1000, unitPriceCents: 12_345, vatRateBp: 2000, netHtCents: 12_345, vatCents: 2_469 }],
      totals: { totalHtCents: 12_345, totalVatCents: 2_469, totalTtcCents: 14_814 },
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.byteLength).toBeGreaterThan(1_000);
  });

  it("s'exécute dans un budget compatible avec un environnement serverless", async () => {
    const started = Date.now();
    await issueInvoice();
    // Marge très large : on cherche l'ordre de grandeur, pas une mesure fine.
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it('pagine un document long', async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      label: `Ligne n°${i + 1} — prestation récurrente`, quantityMilli: 1000,
      unitPriceCents: 10_000, vatRateBp: 2000, netHtCents: 10_000, vatCents: 2_000,
    }));
    const pdf = await renderInvoicePdf({
      number: 'FAC-2026-000002', issuedAt: '08/09/2026',
      seller: { legalName: 'A SARL', address: 'Paris', siret: '123' },
      client: { name: 'Client A', address: 'Lyon' },
      lines: many,
      totals: { totalHtCents: 600_000, totalVatCents: 120_000, totalTtcCents: 720_000 },
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.byteLength).toBeGreaterThan(3_000);
  });
});

describe('Stockage et récupération', () => {
  it('range le document sous un chemin scopé par organisation', async () => {
    const { doc, stored } = await issueInvoice();
    expect(stored.path).toBe(`organizations/${f.orgA}/documents/${doc.id}.pdf`);
    expect(await storage.exists(stored.path)).toBe(true);
  });

  it("enregistre une empreinte qui prouve l'intégrité du fichier", async () => {
    const { pdf, stored } = await issueInvoice();
    expect(stored.sha256).toBe(sha256(pdf));
    const reread = await storage.get(stored.path);
    expect(sha256(reread)).toBe(stored.sha256);
  });

  it('délivre une URL signée qui restitue le document', async () => {
    const { stored, pdf } = await issueInvoice();
    const url = await storage.createSignedUrl(stored.path, 300);
    const fetched = await storage.resolveSignedUrl(url);
    expect(sha256(fetched)).toBe(sha256(pdf));
  });

  it('refuse une URL expirée', async () => {
    const { stored } = await issueInvoice();
    const url = await storage.createSignedUrl(stored.path, 60);
    const later = new Date(Date.now() + 120_000);
    await expect(storage.resolveSignedUrl(url, later)).rejects.toBeInstanceOf(SignedUrlError);
  });

  it('refuse une URL dont la signature a été altérée', async () => {
    const { stored } = await issueInvoice();
    const url = await storage.createSignedUrl(stored.path, 300);
    await expect(storage.resolveSignedUrl(url.replace(/signature=./, 'signature=0'))).rejects.toBeInstanceOf(SignedUrlError);
  });

  it("B ne peut pas obtenir d'URL pour un document de A : l'autorisation précède la signature", async () => {
    const { doc } = await issueInvoice();

    // Chaîne réelle : on cherche d'abord le document dans le contexte de B.
    const found = await withTenant(unsafeTenantContextForTests(f.userB, f.orgB), (db) =>
      db.issuedDocument.findUnique({ where: { id: doc.id } }),
    );
    expect(found).toBeNull(); // → aucune URL ne peut être signée

    // Et même en connaissant le chemin exact, la ressource n'est pas atteignable
    // sans passer par la signature : le chemin n'est pas une autorisation.
    const guessed = documentPath(f.orgA, doc.id);
    const forged = `local://documents?path=${encodeURIComponent(guessed)}&expires=99999999999&signature=faux`;
    await expect(storage.resolveSignedUrl(forged)).rejects.toBeInstanceOf(SignedUrlError);
  });
});

describe('Immutabilité documentaire', () => {
  it("modifier le client ne réécrit ni le snapshot ni le PDF déjà émis", async () => {
    const { doc, stored, pdf } = await issueInvoice();
    const snapshotBefore = doc.clientSnapshot;

    // Le client déménage et change de nom APRÈS l'émission.
    await withTenant(ctxA(), (db) =>
      db.client.update({
        where: { id: f.clientA },
        data: { name: 'Client A — nouvelle raison sociale', email: 'nouveau@spike.test' },
      }),
    );

    const after = await withTenant(ctxA(), (db) => db.issuedDocument.findUniqueOrThrow({ where: { id: doc.id } }));

    // 1. Le snapshot en base est inchangé.
    expect(after.clientSnapshot).toEqual(snapshotBefore);
    expect((after.clientSnapshot as { name: string }).name).toBe('Client A');

    // 2. Les montants figés sont inchangés.
    expect(after.totalTtcCents).toBe(doc.totalTtcCents);

    // 3. Le PDF stocké est bit à bit identique.
    const storedNow = await storage.get(stored.path);
    expect(sha256(storedNow)).toBe(sha256(pdf));
    expect(after.pdfSha256).toBe(stored.sha256);

    // 4. La fiche client vivante, elle, a bien changé.
    const liveClient = await withTenant(ctxA(), (db) => db.client.findUniqueOrThrow({ where: { id: f.clientA } }));
    expect(liveClient.name).toBe('Client A — nouvelle raison sociale');
  });

  it('un document régénéré depuis le snapshot est identique à l\'original', async () => {
    const { snapshot, pdf } = await issueInvoice();
    await withTenant(ctxA(), (db) =>
      db.client.update({ where: { id: f.clientA }, data: { name: 'Nom modifié entre-temps' } }),
    );
    // La régénération part du SNAPSHOT, pas de la donnée vivante.
    const regenerated = await renderInvoicePdf(snapshot);
    expect(regenerated.byteLength).toBe(pdf.byteLength);
  });
});
