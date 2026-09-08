import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { appDb } from '@/lib/db/client';
import { systemDb } from '@/lib/db/system';
import { unsafeTenantContextForTests } from '@/lib/tenant/context';
import * as clients from '@/modules/clients/service';
import { resetDatabase, seedTwoOrganizations, type Fixture } from './helpers';

/**
 * CRUD Client à travers le service — la couche que les Server Actions
 * appellent réellement. Complète isolation.test.ts (qui teste le repository
 * bas niveau) en vérifiant la validation Zod, la recherche/filtre (Lot 2) et
 * le cycle archivage/restauration.
 */

let f: Fixture;
const ctxA = () => unsafeTenantContextForTests(f.userA, f.orgA);

beforeAll(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); f = await seedTwoOrganizations(); });
afterAll(async () => { await appDb.$disconnect(); await systemDb.$disconnect(); });

describe('Création', () => {
  it('crée un client avec les champs minimaux', async () => {
    const created = await clients.createClient(ctxA(), { name: 'Nouveau client' });
    expect(created.organizationId).toBe(f.orgA);
    expect(created.status).toBe('prospect');
    expect(created.kind).toBe('individual');
    expect(created.archivedAt).toBeNull();
  });

  it('crée un client avec statut, notes et dernier contact', async () => {
    const created = await clients.createClient(ctxA(), {
      name: 'X',
      status: 'loyal',
      notes: 'Client historique',
      lastContactAt: '2026-01-15',
    });
    expect(created.status).toBe('loyal');
    expect(created.notes).toBe('Client historique');
    expect(created.lastContactAt?.toISOString().slice(0, 10)).toBe('2026-01-15');
  });

  it('rejette un nom vide', async () => {
    await expect(clients.createClient(ctxA(), { name: '  ' })).rejects.toThrow();
  });

  it('rejette un e-mail invalide', async () => {
    await expect(clients.createClient(ctxA(), { name: 'X', email: 'pas-un-email' })).rejects.toThrow();
  });

  it('rejette un statut invalide', async () => {
    await expect(clients.createClient(ctxA(), { name: 'X', status: 'litige' })).rejects.toThrow();
  });

  it('rejette une date de dernier contact invalide', async () => {
    await expect(clients.createClient(ctxA(), { name: 'X', lastContactAt: 'pas-une-date' })).rejects.toThrow();
  });

  it('ignore un organizationId injecté dans les données (dérivé du contexte, pas du payload)', async () => {
    const created = await clients.createClient(ctxA(), { name: 'X' });
    expect(created.organizationId).toBe(f.orgA);
  });
});

describe('Lecture / recherche / filtre', () => {
  it('liste uniquement les clients de son organisation', async () => {
    const rows = await clients.listClients(ctxA());
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('Client A');
  });

  it('ne peut pas lire un client d’une autre organisation', async () => {
    const row = await clients.getClient(ctxA(), f.clientB);
    expect(row).toBeNull();
  });

  it('filtre par statut', async () => {
    await clients.createClient(ctxA(), { name: 'À relancer', status: 'to_follow_up' });
    const rows = await clients.listClients(ctxA(), { status: 'to_follow_up' });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('À relancer');
  });

  it('recherche par nom, insensible à la casse', async () => {
    await clients.createClient(ctxA(), { name: 'Jean Petit' });
    const rows = await clients.listClients(ctxA(), { search: 'jean' });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('Jean Petit');
  });

  it('exclut les clients archivés par défaut', async () => {
    await clients.archiveClient(ctxA(), f.clientA);
    const rows = await clients.listClients(ctxA());
    expect(rows).toHaveLength(0);
    const withArchived = await clients.listClients(ctxA(), { includeArchived: true });
    expect(withArchived).toHaveLength(1);
  });
});

describe('Mise à jour', () => {
  it('met à jour un client existant', async () => {
    const updated = await clients.updateClient(ctxA(), f.clientA, { name: 'Renommé' });
    expect(updated.name).toBe('Renommé');
  });
});

describe('Archivage (suppression = archivage, séparé du statut CRM)', () => {
  it('archive puis restaure un client sans changer son statut CRM', async () => {
    await clients.updateClient(ctxA(), f.clientA, { name: 'Client A', status: 'loyal' });
    const archived = await clients.archiveClient(ctxA(), f.clientA);
    expect(archived.archivedAt).not.toBeNull();
    expect(archived.status).toBe('loyal'); // le statut CRM n'est pas écrasé par l'archivage

    const restored = await clients.restoreClient(ctxA(), f.clientA);
    expect(restored.archivedAt).toBeNull();
    expect(restored.status).toBe('loyal');
  });

  it('un client archivé existe toujours en base (pas de suppression physique)', async () => {
    await clients.archiveClient(ctxA(), f.clientA);
    const row = await systemDb.client.findUnique({ where: { id: f.clientA } });
    expect(row).not.toBeNull();
    expect(row!.archivedAt).not.toBeNull();
  });
});
