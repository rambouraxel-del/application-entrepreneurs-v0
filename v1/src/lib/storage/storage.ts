/**
 * Port de stockage de documents (docs/v1/architecture.md §4.1) : le métier ne
 * connaît que cette interface, jamais un SDK de fournisseur directement.
 *
 * Deux implémentations :
 *   - `SupabaseStorage`  : adaptateur RÉEL contre Supabase Storage. Code
 *     d'intégration complet, mais ⚠️ VALIDATION CLOUD REQUISE — aucun projet
 *     Supabase n'était accessible pour l'exécuter dans cet environnement.
 *   - `LocalDocumentStorage` : adaptateur système de fichiers, utilisé en
 *     développement local et par les tests automatisés lorsque les variables
 *     Supabase sont absentes. Porté du Lot 0, où il a été réellement testé
 *     (12 tests, docs/v1/lot-0-validation.md §7.2).
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export interface DocumentStorage {
  put(path: string, content: Buffer, contentType?: string): Promise<{ path: string; sha256: string; size: number }>;
  exists(path: string): Promise<boolean>;
  get(path: string): Promise<Buffer>;
  createSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
  remove(path: string): Promise<void>;
}

export class SignedUrlError extends Error {}

/** Chemin scopé tenant. Rappel : ce n'est PAS un mécanisme de sécurité, seulement un rangement prévisible. */
export function orgLogoPath(organizationId: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `organizations/${organizationId}/logo/${safeName}`;
}

export function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/** PDF d'un devis émis (Lot 3) — même remarque : rangement, pas une autorisation. */
export function quoteDocumentPath(organizationId: string, quoteId: string): string {
  return `organizations/${organizationId}/quotes/${quoteId}.pdf`;
}

/** PDF d'une facture émise (Lot 4) — idem. */
export function invoiceDocumentPath(organizationId: string, invoiceId: string): string {
  return `organizations/${organizationId}/invoices/${invoiceId}.pdf`;
}

// ---------------------------------------------------------------------------
// Adaptateur RÉEL — Supabase Storage.
// ---------------------------------------------------------------------------

/**
 * Utilise la clé de SERVICE (contourne les policies Storage), car le Lot 1
 * vérifie l'autorisation en base (RLS sur `organizations`/`clients`) AVANT
 * d'appeler le stockage — exactement le principe validé au Lot 0 : "le
 * chemin n'est pas une autorisation, l'autorisation précède la signature".
 * La clé de service ne quitte jamais ce module serveur.
 */
export class SupabaseStorage implements DocumentStorage {
  constructor(
    private readonly supabaseUrl: string,
    private readonly serviceRoleKey: string,
    private readonly bucket: string,
  ) {}

  private async client() {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(this.supabaseUrl, this.serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  async put(path: string, content: Buffer, contentType = 'application/octet-stream') {
    const supabase = await this.client();
    const { error } = await supabase.storage
      .from(this.bucket)
      .upload(path, content, { contentType, upsert: true });
    if (error) throw new Error(`Échec de l'envoi vers Supabase Storage : ${error.message}`);
    return { path, sha256: sha256(content), size: content.byteLength };
  }

  async exists(path: string) {
    const supabase = await this.client();
    const dir = path.split('/').slice(0, -1).join('/');
    const filename = path.split('/').at(-1) ?? '';
    const { data, error } = await supabase.storage.from(this.bucket).list(dir, { search: filename });
    if (error) throw new Error(`Échec de la vérification Supabase Storage : ${error.message}`);
    return (data ?? []).some((entry) => entry.name === filename);
  }

  async get(path: string) {
    const supabase = await this.client();
    const { data, error } = await supabase.storage.from(this.bucket).download(path);
    if (error) throw new Error(`Échec du téléchargement Supabase Storage : ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }

  async createSignedUrl(path: string, expiresInSeconds: number) {
    const supabase = await this.client();
    const { data, error } = await supabase.storage.from(this.bucket).createSignedUrl(path, expiresInSeconds);
    if (error) throw new Error(`Échec de la signature Supabase Storage : ${error.message}`);
    return data.signedUrl;
  }

  async remove(path: string) {
    const supabase = await this.client();
    const { error } = await supabase.storage.from(this.bucket).remove([path]);
    if (error) throw new Error(`Échec de la suppression Supabase Storage : ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Adaptateur local — développement et tests automatisés.
// ---------------------------------------------------------------------------

export class LocalDocumentStorage implements DocumentStorage {
  constructor(private readonly root: string, private readonly secret: string) {}

  private full(path: string): string {
    const full = resolve(this.root, path);
    if (!full.startsWith(resolve(this.root))) throw new Error('Chemin de document invalide');
    return full;
  }

  async put(path: string, content: Buffer) {
    const full = this.full(path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content);
    return { path, sha256: sha256(content), size: content.byteLength };
  }

  async exists(path: string) {
    try {
      await access(this.full(path));
      return true;
    } catch {
      return false;
    }
  }

  async get(path: string) {
    return readFile(this.full(path));
  }

  async remove(path: string) {
    const { rm } = await import('node:fs/promises');
    await rm(this.full(path), { force: true });
  }

  async createSignedUrl(path: string, expiresInSeconds: number) {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const signature = this.sign(path, expiresAt);
    const params = new URLSearchParams({ path, expires: String(expiresAt), signature });
    return `local://documents?${params.toString()}`;
  }

  async resolveSignedUrl(url: string, now = new Date()) {
    const parsed = new URL(url);
    const path = parsed.searchParams.get('path') ?? '';
    const expiresAt = Number(parsed.searchParams.get('expires'));
    const signature = parsed.searchParams.get('signature') ?? '';

    const expected = Buffer.from(this.sign(path, expiresAt));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
      throw new SignedUrlError('Signature invalide');
    }
    if (Math.floor(now.getTime() / 1000) > expiresAt) throw new SignedUrlError('URL expirée');
    return this.get(path);
  }

  private sign(path: string, expiresAt: number): string {
    return createHmac('sha256', this.secret).update(`${path}:${expiresAt}`).digest('hex');
  }
}

/**
 * Résout l'implémentation à utiliser : Supabase si configuré, adaptateur
 * local sinon (développement, tests). Le choix est explicite et journalisé
 * une seule fois — jamais silencieux en production (voir organizations/service.ts).
 */
export function resolveDocumentStorage(): { storage: DocumentStorage; backend: 'supabase' | 'local' } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'org-logos';

  if (url && serviceKey) {
    return { storage: new SupabaseStorage(url, serviceKey, bucket), backend: 'supabase' };
  }

  const root = process.env.LOCAL_STORAGE_ROOT ?? '.local-storage';
  const secret = process.env.DOCUMENT_URL_SECRET ?? 'dev-only-not-a-real-secret';
  return { storage: new LocalDocumentStorage(root, secret), backend: 'local' };
}
