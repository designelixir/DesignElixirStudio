'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ExpenseCategory, StatementCompany } from '@/types/globalTypes';
import {
  fetchStatementCompaniesAction,
  fetchStatementDescriptorsAction,
  type DescriptorCount,
} from '@/app/actions/statementCompanyActions';
import { fetchExpenseCategoriesAction } from '@/app/actions/expenseCategoryActions';
import BooksHeader from '../BooksHeader';
import CompanyEditor from './CompanyEditor';

const COLUMNS = 5;

// Every company that statement lines get matched to, with its default category,
// work/personal default, and the bank descriptors linked to it
export default function Identifiers() {
  const [companies, setCompanies] = useState<StatementCompany[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  // Every statement descriptor on your transactions, for phrase matching
  const [allDescriptors, setAllDescriptors] = useState<DescriptorCount[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  // Row open for editing: a company id, 'new', or null
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(
    () =>
      Promise.all([fetchStatementCompaniesAction(), fetchExpenseCategoriesAction()])
        .then(([comps, cats]) => {
          setCompanies(comps);
          setCategories(cats);
          setError('');
        })
        .catch((err) => {
          console.error('Error loading companies:', err);
          setError(err instanceof Error ? err.message : 'Failed to load companies');
        })
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
    fetchStatementDescriptorsAction()
      .then(setAllDescriptors)
      .catch((err) => {
        console.error('Error loading descriptors:', err);
        setAllDescriptors([]);
      });
  }, [load]);

  // Matches the name or any descriptor
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.descriptors.some((d) => d.toLowerCase().includes(q)) ||
        (c.phrases ?? []).some((p) => p.phrase.toLowerCase().includes(q))
    );
  }, [companies, query]);

  const descriptorCount = companies.reduce((sum, c) => sum + c.descriptors.length, 0);
  const category = (id: string | null) => categories.find((c) => c.id === id);

  const handleSaved = (saved: StatementCompany) => {
    setCompanies((prev) =>
      [...prev.filter((c) => c.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditing(null);
  };

  return (
    <div className='full-width basic-padding'>
      <BooksHeader
        title='Identifiers'
        subtitle={
          <h6>
            {loading
              ? 'Loading...'
              : `${companies.length} compan${companies.length === 1 ? 'y' : 'ies'} · ${descriptorCount} statement descriptor${descriptorCount === 1 ? '' : 's'}`}
          </h6>
        }
        actions={
          <button type='button' onClick={() => setEditing('new')} disabled={editing === 'new'}>
            + Add Company
          </button>
        }
      />

      <p style={{ color: '#666', fontSize: '13px', marginTop: 0, maxWidth: '720px' }}>
        When a statement is parsed, a line whose descriptor matches one listed here is filled in with that company and
        its defaults. Saving a transaction with a company links its descriptor automatically.
      </p>

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

      <input
        type='search'
        placeholder='Search companies or descriptors…'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: '100%', maxWidth: '420px', marginBottom: '15px' }}
        aria-label='Search companies or descriptors'
      />

      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Default category</th>
            <th>Default type</th>
            <th>Descriptors</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {editing === 'new' && (
            <CompanyEditor
              company={null}
              categories={categories}
              allDescriptors={allDescriptors}
              columnCount={COLUMNS}
              onSaved={handleSaved}
              onDeleted={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          )}
          {loading && (
            <tr><td colSpan={COLUMNS} style={{ color: '#666' }}>Loading...</td></tr>
          )}
          {!loading && visible.length === 0 && (
            <tr>
              <td colSpan={COLUMNS} style={{ color: '#666' }}>
                {companies.length === 0 ? 'No companies yet.' : 'No companies match your search.'}
              </td>
            </tr>
          )}
          {visible.map((c) => {
            const cat = category(c.default_category_id);
            const open = editing === c.id;
            return (
              <React.Fragment key={c.id}>
                <tr
                  onClick={() => setEditing(open ? null : c.id)}
                  style={{ cursor: 'pointer', background: open ? 'var(--white-1, #fafafa)' : undefined }}
                >
                  <td><strong>{c.name}</strong></td>
                  <td>
                    {cat ? (
                      <div className='category-tag flex-center-start no-flex-grow' style={{ gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color ?? '#ccc', flex: 'none' }} />
                        <p>{cat.title}</p>
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}>—</span>
                    )}
                  </td>
                  <td>
                    {c.default_work_expense === null ? (
                      <span style={{ color: '#999' }}>—</span>
                    ) : c.default_work_expense ? (
                      'Work'
                    ) : (
                      'Personal'
                    )}
                  </td>
                  <td style={{ maxWidth: '420px' }}>
                    {(c.phrases ?? []).length > 0 && (
                      <div style={{ fontSize: '12px', marginBottom: '2px' }}>
                        Phrases: {(c.phrases ?? []).map((p) => `“${p.phrase}”`).join(', ')}
                      </div>
                    )}
                    {c.descriptors.length === 0 ? (
                      <span style={{ color: '#999' }}>None</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        <strong style={{ color: 'black' }}>{c.descriptors.length}</strong> ·{' '}
                        {c.descriptors.slice(0, 2).join(' · ')}
                        {c.descriptors.length > 2 && ` · +${c.descriptors.length - 2} more`}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(open ? null : c.id);
                      }}
                    >
                      {open ? 'Close' : 'Edit'}
                    </button>
                  </td>
                </tr>
                {open && (
                  <CompanyEditor
                    company={c}
                    categories={categories}
                    allDescriptors={allDescriptors}
                    columnCount={COLUMNS}
                    onSaved={handleSaved}
                    onDeleted={(id) => {
                      setCompanies((prev) => prev.filter((x) => x.id !== id));
                      setEditing(null);
                    }}
                    onCancel={() => setEditing(null)}
                  />
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
