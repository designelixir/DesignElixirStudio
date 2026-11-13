'use client';

import { useState, useEffect } from 'react';
import { StatementParserProps } from './parserTypes';
import { extractPdfRows, PdfRow } from './pdfText';
import { ParsedTransaction, StatementPeriod } from './parserUtils';
import ParsedTransactionsPreview from './ParsedTransactionsPreview';

interface StatementPdfParserProps extends StatementParserProps {
  title: string; // e.g. "Discover Parser"
  // The bank-specific rules: turns the PDF's rows of text into transactions
  parse: (rows: PdfRow[], fallbackPeriod?: StatementPeriod) => ParsedTransaction[];
}

// Reads the statement PDF with a bank's parser, then shows the editable rows.
export default function StatementPdfParser({
  title,
  parse,
  statement,
  pdfUrl,
  existingTransactions,
  onImported,
}: StatementPdfParserProps) {
  const [transactions, setTransactions] = useState<ParsedTransaction[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;

    extractPdfRows(pdfUrl)
      .then((rows) => {
        if (cancelled) return;
        // The statement's dates fill in the year if the PDF doesn't print its period
        setTransactions(parse(rows, { start: statement.period_start, end: statement.period_end }));
      })
      .catch((err) => {
        console.error('Error reading PDF:', err);
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not read the PDF');
      });

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, parse, statement.period_start, statement.period_end]);

  return (
    <div className='full-width'>
      <h3>{title}</h3>
      <p style={{ color: '#666', fontSize: '12px', margin: 0 }}>File: {statement.file_name}</p>

      {error && <div style={{ color: 'red', margin: '10px 0' }}>{error}</div>}
      {!error && !transactions && <p style={{ color: '#666' }}>Reading PDF...</p>}
      {transactions && (
        <ParsedTransactionsPreview
          statement={statement}
          transactions={transactions}
          existingTransactions={existingTransactions}
          onImported={onImported}
        />
      )}
    </div>
  );
}
