import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

/**
 * PORT de stockage de documents.
 *
 * Le métier ne connaît que cette interface — il n'importe aucun SDK de
 * fournisseur (architecture §4.1). Le spike fournit un adaptateur système de
 * fichiers, réellement testable hors ligne ; l'adaptateur Supabase Storage
 * implémentera la même interface en Lot 1.
 */
export interface DocumentStorage {
  put(path: string, content: Buffer): Promise<{ path: string; sha256: string; size: number }>;
  exists(path: string): Promise<boolean>;
  get(path: string): Promise<Buffer>;
  createSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
  resolveSignedUrl(url: string, now?: Date): Promise<Buffer>;
}

export class SignedUrlError extends Error {}

/**
 * Chemin de stockage scopé tenant.
 *
 * ⚠️ Le chemin n'est PAS un mécanisme de sécurité : il rend seulement
 * l'organisation lisible et le rangement prévisible. L'autorisation reste
 * vérifiée en base AVANT de signer une URL (cf. tests documents).
 */
export function documentPath(organizationId: string, documentId: string): string {
  return `organizations/${organizationId}/documents/${documentId}.pdf`;
}

export function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/** Adaptateur système de fichiers — spike et tests uniquement. */
export class LocalDocumentStorage implements DocumentStorage {
  constructor(private readonly root: string, private readonly secret: string) {}

  private full(path: string): string {
    const full = resolve(this.root, path);
    // Défense contre un chemin fabriqué qui remonterait hors de la racine.
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

  /** URL signée à durée de vie courte : chemin + expiration + HMAC. */
  async createSignedUrl(path: string, expiresInSeconds: number) {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const signature = this.sign(path, expiresAt);
    // Le chemin passe en paramètre : pas d'ambiguïté d'analyse d'URL, et le
    // format reste proche d'une URL signée de fournisseur de stockage.
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
    if (Math.floor(now.getTime() / 1000) > expiresAt) {
      throw new SignedUrlError('URL expirée');
    }
    return this.get(path);
  }

  private sign(path: string, expiresAt: number): string {
    return createHmac('sha256', this.secret).update(`${path}:${expiresAt}`).digest('hex');
  }
}

export const storageRootFor = (dir: string) => join(dir, 'spike-storage');
