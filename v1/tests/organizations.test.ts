import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { appDb } from '@/lib/db/client';
import { systemDb } from '@/lib/db/system';
import { ForbiddenOrganizationError } from '@/lib/tenant/context';
import { resolveTenantContext, listMemberships, resolveDefaultTenantContext } from '@/modules/organizations/service';
import type { Session } from '@/modules/auth/session';
import { resetDatabase, seedTwoOrganizations, type Fixture } from './helpers';

/**
 * Résolution du contexte tenant à partir d'une session — la porte d'entrée de
 * toute mutation métier. Ne dépend pas de Supabase Auth (Session est un objet
 * simple {userId, email}) : testable localement sans VALIDATION CLOUD.
 */

let f: Fixture;
const sessionA = (): Session => ({ userId: f.userA, email: 'a@test.local' });

beforeAll(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); f = await seedTwoOrganizations(); });
afterAll(async () => { await appDb.$disconnect(); await systemDb.$disconnect(); });

describe('resolveTenantContext', () => {
  it('accepte une organisation dont l’utilisateur est réellement membre', async () => {
    const ctx = await resolveTenantContext(sessionA(), f.orgA);
    expect(ctx.organizationId).toBe(f.orgA);
    expect(ctx.userId).toBe(f.userA);
  });

  it("refuse une organisation dont l'utilisateur n'est PAS membre — même si elle existe", async () => {
    await expect(resolveTenantContext(sessionA(), f.orgB)).rejects.toBeInstanceOf(ForbiddenOrganizationError);
  });

  it('refuse un organizationId qui n’existe pas du tout', async () => {
    await expect(resolveTenantContext(sessionA(), 'org-inexistante')).rejects.toBeInstanceOf(
      ForbiddenOrganizationError,
    );
  });
});

describe('listMemberships / resolveDefaultTenantContext', () => {
  it('ne liste que les appartenances réelles de l’utilisateur', async () => {
    const memberships = await listMemberships(sessionA());
    expect(memberships).toHaveLength(1);
    expect(memberships[0]!.organizationId).toBe(f.orgA);
  });

  it('résout par défaut la première organisation de l’utilisateur', async () => {
    const ctx = await resolveDefaultTenantContext(sessionA());
    expect(ctx?.organizationId).toBe(f.orgA);
  });

  it('renvoie null pour un utilisateur sans aucune organisation', async () => {
    const ctx = await resolveDefaultTenantContext({ userId: 'inconnu', email: null });
    expect(ctx).toBeNull();
  });
});
