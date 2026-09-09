import { NextResponse } from 'next/server';
import { requireTenantContext } from '@/modules/auth/requireTenantContext';
import { getInvoice } from '@/modules/invoices/service';
import { resolveDocumentStorage } from '@/lib/storage/storage';

/** Téléchargement du PDF d'une facture émise — même principe que le devis (Lot 3). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenantContext();
  const invoice = await getInvoice(ctx, id);
  if (!invoice || !invoice.pdfPath) return NextResponse.json({ error: 'PDF introuvable' }, { status: 404 });

  const { storage } = resolveDocumentStorage();
  const pdf = await storage.get(invoice.pdfPath);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.number ?? 'facture'}.pdf"`,
    },
  });
}
