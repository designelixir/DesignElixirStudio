import { Statement, Transaction } from '@/types/globalTypes';

// Props every statement parser (ParseDiscover, ParseChase, ...) receives
export interface StatementParserProps {
  statement: Statement; // the statement row (name, file_name, account, dates...)
  pdfUrl: string;       // short-lived signed URL for downloading the PDF
  existingTransactions: Transaction[]; // transactions already saved for this statement
  onImported?: () => void; // called after transactions are saved
}
