'use client';

import { useState, useEffect } from 'react';
import { StatementParserProps } from './parserTypes';
import { extractPdfRows, PdfRow } from './pdfText';
import { ParsedTransaction, StatementPeriod, StatementSummary } from './parserUtils';
import { updateStatementAction } from '@/app/actions/statementActions';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
import ParsedTransactionsPreview from './ParsedTransactionsPreview';

interface StatementPdfParserProps extends StatementParserProps {
  title: string; // e.g. "Discover Parser"
  // The bank-specific rules: turns the PDF's rows of text into transactions
  parse: (rows: PdfRow[], fallbackPeriod?: StatementPeriod) => ParsedTransaction[];
  // Reads the Previous / New Balance printed on the statement
  summarize?: (rows: PdfRow[]) => StatementSummary;
}

// Reads the statement PDF with a bank's parser, then shows the editable rows.
export default function StatementPdfParser({
  title,
  parse,
  summarize,
  statement,
  pdfUrl,
  existingTransactions,
  onImported,
}: StatementPdfParserProps) {
  const [transactions, setTransactions] = useState<ParsedTransaction[] | null>(null);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [summaryNote, setSummaryNote] = useState('');

  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;

    extractPdfRows(pdfUrl)
      .then((rows) => {
        if (cancelled) return;
        // The statement's dates fill in the year if the PDF doesn't print its period
        setTransactions(parse(rows, { start: statement.period_start, end: statement.period_end }));

        // Save the printed balances on the statement (used for the account's
        // opening balance and to check that transactions add up)
        const found = summarize?.(rows) ?? null;
        setSummary(found);
        const changed =
          found &&
          ((found.previousBalance !== null && found.previousBalance !== nullableNumber(statement.previous_balance)) ||
            (found.newBalance !== null && found.newBalance !== nullableNumber(statement.new_balance)));
        if (found && changed) {
          updateStatementAction(statement.id, {
            previous_balance: found.previousBalance,
            new_balance: found.newBalance,
          }).catch((err) => {
            console.error('Error saving statement balances:', err);
            if (!cancelled) setSummaryNote(err instanceof Error ? err.message : 'Could not save the balances');
          });
        }
      })
      .catch((err) => {
        console.error('Error reading PDF:', err);
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not read the PDF');
      });

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, parse, summarize, statement.id, statement.period_start, statement.period_end, statement.previous_balance, statement.new_balance]);

  return (
    <div className='full-width'>
      <h3>{title}</h3>
      <p style={{ color: '#666', fontSize: '12px', margin: 0 }}>File: {statement.file_name}</p>
      {summary && (summary.previousBalance !== null || summary.newBalance !== null) && (
        <p style={{ color: '#666', fontSize: '12px', margin: 0 }}>
          Statement balance: {summary.previousBalance !== null ? currency.format(summary.previousBalance) : '—'} →{' '}
          {summary.newBalance !== null ? currency.format(summary.newBalance) : '—'}
        </p>
      )}
      {summaryNote && <p style={{ color: '#b35c00', fontSize: '12px', margin: 0 }}>{summaryNote}</p>}

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

// Supabase returns numeric columns as strings sometimes; compare as numbers
function nullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}
