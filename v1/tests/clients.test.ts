import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { appDb } from '@/lib/db/client';
import { systemDb } from '@/lib/db/system';
import { unsafeTenantContextForTests } from '@/lib/tenant/context';
import * as clients from '@/modules/clients/service';
import { resetDatabase, seedTwoOrganizations, type Fixture } from './helpers';

/**
 * CRUD Client à travers le service — la couche que les Server Actions
 * appellent réellement. Complète isolation.test.ts (qui teste le repository
 * bas niveau) en vérifiant la validation Zod et le cycle archivage/restauration.
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
  });

  it('rejette un nom vide', async () => {
    await expect(clients.createClient(ctxA(), { name: '  ' })).rejects.toThrow();
  });

  it('rejette un e-mail invalide', async () => {
    await expect(clients.createClient(ctxA(), { name: 'X', email: 'pas-un-email' })).rejects.toThrow();
  });

  it('ignore un organizationId injecté dans les données (dérivé du contexte, pas du payload)', async () => {
    const created = await clients.createClient(ctxA(), { name: 'X' });
    expect(created.organizationId).toBe(f.orgA);
  });
});

describe('Lecture', () => {
  it('liste uniquement les clients de son organisation', async () => {
    const rows = await clients.listClients(ctxA());
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('Client A');
  });

  it('ne peut pas lire un client d’une autre organisation', async () => {
    const row = await clients.getClient(ctxA(), f.clientB);
    expect(row).toBeNull();
  });
});

describe('Mise à jour', () => {
  it('met à jour un client existant', async () => {
    const updated = await clients.updateClient(ctxA(), f.clientA, { name: 'Renommé' });
    expect(updated.name).toBe('Renommé');
  });
});

describe('Archivage (suppression = archivage)', () => {
  it('archive puis restaure un client', async () => {
    const archived = await clients.archiveClient(ctxA(), f.clientA);
    expect(archived.status).toBe('archived');

    const restored = await clients.restoreClient(ctxA(), f.clientA);
    expect(restored.status).toBe('active');
  });

  it('un client archivé existe toujours en base (pas de suppression physique)', async () => {
    await clients.archiveClient(ctxA(), f.clientA);
    const row = await systemDb.client.findUnique({ where: { id: f.clientA } });
    expect(row).not.toBeNull();
    expect(row!.status).toBe('archived');
  });
});
