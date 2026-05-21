export interface LineItem {
  id: number;
  description: string;
  quantity: number;
  rate: number;
}

export interface ValidationErrors {
  invoiceNumber?: string;
  dueDate?: string;
  clientName?: string;
  clientEmail?: string;
  items?: string;
}

export interface InvoicePDFProps {
  clientName: string;
  clientEmail: string;
  clientDetails: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceId: string;
  dueDate: string;
  notes: string;
  terms: string;
  paymentNotes: string;
  taxRate: number;
  discountRate: number;
  items: LineItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export interface InvoiceData {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_details: string;
  total: number;
  notes: string;
  terms: string;
  items: { id: number; description: string; quantity: number; rate: number }[];
  created_at: string;
  paid: boolean;
  paid_at: string | null;
  stripe_payment_intent: string | null;
}