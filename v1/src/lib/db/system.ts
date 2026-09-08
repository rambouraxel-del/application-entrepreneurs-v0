/**
 * Rôle SYSTÈME (BYPASSRLS) — l'UNIQUE porte de sortie de la Row Level Security.
 *
 * ⚠️ Ce module ne doit être importé que depuis :
 *   - src/modules/organizations/service.ts (création d'organisation + premier
 *     membership à l'inscription : aucun contexte tenant n'existe encore) ;
 *   - prisma/seed.ts (jeu de données de démonstration) ;
 *   - les tests (fabrication des fixtures).
 *
 * Toute autre importation est un contournement de l'isolation tenant.
 * (Garde de revue en attendant une règle de lint dédiée — voir
 * docs/v1/lot-1-socle.md, limite documentée.)
 */
import { PrismaClient } from '../../../generated/prisma/index';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manquante — voir .env.example`);
  return value;
}

export const systemDb = new PrismaClient({ datasourceUrl: requireEnv('DATABASE_URL_SYSTEM') });
