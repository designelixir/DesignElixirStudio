'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Account, Statement } from '@/types/globalTypes';
import { fetchAccountsAction } from '@/app/actions/accountActions';
import { fetchStatementsAction } from '@/app/actions/statementActions';
import UploadStatement from './UploadStatement';
import MiniCreditCard from '../MiniCreditCard';
import { formatDay } from './formatDay';
import BooksHeader from '../BooksHeader';

export default function Statements() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Account whose statements are shown below the grid (null = none picked yet)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [stmts, accts] = await Promise.all([fetchStatementsAction(), fetchAccountsAction()]);
      setStatements(stmts);
      setAccounts(accts);
      setError('');
    } catch (err) {
      console.error('Error loading statements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Accounts that have at least one statement, with their statements (newest first)
  const accountsWithStatements = accounts
    .map((account) => ({
      account,
      statements: statements.filter((s) => s.account_id === account.id),
    }))
    .filter((group) => group.statements.length > 0);

  const selected = accountsWithStatements.find((g) => g.account.id === selectedAccountId) ?? null;

  return (
    <div className='full-width basic-padding'>
      <BooksHeader
        title='Statements'
        subtitle={<h6>{loading ? 'Loading...' : `${statements.length} statement${statements.length === 1 ? '' : 's'}`}</h6>}
      />

      <UploadStatement accounts={accounts} onUploaded={loadData} />

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

      {!loading && !error && statements.length === 0 && (
        <p style={{ color: '#666' }}>No statements yet. Click “Import Statement” to upload a PDF.</p>
      )}

      {accountsWithStatements.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
          {accountsWithStatements.map(({ account, statements: accountStatements }) => {
            const isSelected = account.id === selectedAccountId;
            const latest = accountStatements[0];
            return (
              <div
                key={account.id}
                role='button'
                tabIndex={0}
                aria-pressed={isSelected}
                className='card flex-center-start'
                onClick={() => setSelectedAccountId(isSelected ? null : account.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedAccountId(isSelected ? null : account.id);
                  }
                }}
                style={{
                  gap: '12px',
                  cursor: 'pointer',
                  background: 'white',
                  border: isSelected ? '2px solid var(--navy)' : '1px solid #e0e0e0',
                }}
              >
                {/* The mini card links to the account page; let clicks go to this card instead */}
                <div style={{ pointerEvents: 'none', flex: 'none' }}>
                  <MiniCreditCard accountId={account.id} account={account} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{account.brand ? `${account.brand} ${account.name}` : account.name}</h3>
                  <h6 style={{ margin: 0 }}>
                    {accountStatements.length} statement{accountStatements.length === 1 ? '' : 's'}
                    {latest?.period_end ? ` · latest ${formatDay(latest.period_end)}` : ''}
                  </h6>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div style={{ marginTop: '25px' }}>
          <div className='flex-center-start' style={{ gap: '10px', marginBottom: '10px' }}>
            <MiniCreditCard accountId={selected.account.id} account={selected.account} />
            <h2 style={{ margin: 0 }}>Statements</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {selected.statements.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/books/statements/${s.id}`}><strong>{s.name || s.file_name}</strong></Link>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDay(s.period_start)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDay(s.period_end)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
