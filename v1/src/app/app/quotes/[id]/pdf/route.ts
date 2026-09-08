import { NextResponse } from 'next/server';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { getQuote } from '@/modules/quotes/service';
import { resolveDocumentStorage } from '@/lib/storage/storage';

/**
 * Téléchargement du PDF d'un devis émis.
 *
 * Volontairement PAS une URL signée exposée côté client : l'autorisation
 * passe par la session + RLS (comme tout le reste du produit), le PDF est
 * lu côté serveur et streamé — même principe que Storage (Lot 1) : "le
 * chemin n'est pas une autorisation, l'autorisation précède l'accès".
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenantContext();
  const quote = await getQuote(ctx, id); // scopé tenant : 404 si autre organisation
  if (!quote || !quote.pdfPath) return NextResponse.json({ error: 'PDF introuvable' }, { status: 404 });

  const { storage } = resolveDocumentStorage();
  const pdf = await storage.get(quote.pdfPath);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${quote.number ?? 'devis'}.pdf"`,
    },
  });
}
