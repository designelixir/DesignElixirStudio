import { getInvoice } from '../invoiceActions';
import InvoiceWrapper from "../InvoiceWrapper";

export default async function SingleInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  return <InvoiceWrapper invoice={invoice} />;
}