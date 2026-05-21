// components/invoice/PDFToolbarLineItems.tsx
'use client';

import { InvoiceFields, PDFLineItem } from '../types/globalTypes';
import Image from 'next/image';

interface PDFToolbarLineItemsProps {
  fields: InvoiceFields;
  items: PDFLineItem[];
  onFieldChange: (key: keyof InvoiceFields, val: string | boolean | number) => void;
  onItemUpdate: (id: number, patch: Partial<PDFLineItem>) => void;
  onItemAdd: (item: Omit<PDFLineItem, 'id'>) => void;
  onItemRemove: (id: number) => void;
  defaultRate?: number;
}

function emptyDraft(rate = 0): Omit<PDFLineItem, 'id'> {
  return { desc: '', qty: 1, qtyDisplay: '1', rate, type: 'hourly' };
}

import { useState } from 'react';

export default function PDFToolbarLineItems({
  fields,
  items,
  onFieldChange,
  onItemUpdate,
  onItemAdd,
  onItemRemove,
  defaultRate = 0,
}: PDFToolbarLineItemsProps) {
  const [draft, setDraft] = useState<Omit<PDFLineItem, 'id'>>(emptyDraft(defaultRate));

  const updateDraft = (patch: Partial<Omit<PDFLineItem, 'id'>>) =>
    setDraft(prev => ({ ...prev, ...patch }));

  const commitDraft = () => {
    if (!draft.desc.trim()) return;
    onItemAdd(draft);
    setDraft(emptyDraft(defaultRate));
  };

  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);

  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr className='pdf-line-items-table' style={{border: 'unset!important'}}>
            <th>Description</th>
            <th style={{ textAlign: 'left', width: '70px' }}>Type</th>
            <th style={{ textAlign: 'right', width: '48px' }}>Qty</th>
            <th style={{ textAlign: 'right', width: '70px' }}>Rate</th>
            <th style={{ textAlign: 'right', width: '64px' }}>Total</th>
            <th style={{ width: '28px' }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr className='pdf-line-items-table' key={item.id} style={{borderBottom: 'unset!important'}}>
              <td>
                <input value={item.desc} onChange={e => onItemUpdate(item.id, { desc: e.target.value })} placeholder='Description' style={{ width: '100%' }} />
              </td>
              <td>
                <select
                  value={item.type}
                  onChange={e => onItemUpdate(item.id, { type: e.target.value as PDFLineItem['type'] })}
                  style={{ width: '68px', fontSize: '12px' }}
                >
                  <option value="hourly">Hourly</option>
                  <option value="fixed">Fixed</option>
                  <option value="other">Other</option>
                </select>
              </td>
              <td>
                <input
                  value={item.qtyDisplay}
                  onChange={e => {
                    const raw = e.target.value;
                    if (/^\d*\.?\d?$/.test(raw)) {
                      onItemUpdate(item.id, { qtyDisplay: raw, qty: parseFloat(raw) || 0 });
                    }
                  }}
                  placeholder='1'
                  style={{ width: '44px', textAlign: 'right' }}
                />
              </td>
              <td style={{ padding: '3px 2px' }}>
                <input
                  type='number'
                  value={item.rate || ''}
                  onChange={e => onItemUpdate(item.id, { rate: parseFloat(e.target.value) || 0 })}
                  placeholder='0'
                  style={{ width: '64px', textAlign: 'right' }}
                />
              </td>
              <td style={{ textAlign: 'right', fontSize: '12px', padding: '3px 4px', whiteSpace: 'nowrap' }}>
                ${(item.qty * item.rate).toFixed(2)}
              </td>
              <td style={{ textAlign: 'center' }}>
                <button
                  onClick={() => onItemRemove(item.id)}
                  className='icon-button'
                ><Image src="/trash.svg" alt="trash icon" width={15} height={15} /></button>
              </td>
            </tr>
          ))}

          {/* Draft row */}
          <tr style={{border: 'unset!important'}}>
            <td style={{ padding: '3px 2px' }}>
              <input value={draft.desc} onChange={e => updateDraft({ desc: e.target.value })} placeholder='Description' style={{ width: '100%' }} />
            </td>
            <td style={{ padding: '3px 2px' }}>
              <select
                value={draft.type}
                onChange={e => updateDraft({ type: e.target.value as PDFLineItem['type'] })}
                style={{ width: '68px', fontSize: '12px' }}
              >
                <option value="hourly">Hourly</option>
                <option value="fixed">Fixed</option>
                <option value="other">Other</option>
              </select>
            </td>
            <td style={{ padding: '3px 2px' }}>
              <input
                value={draft.qtyDisplay}
                onChange={e => {
                  const raw = e.target.value;
                  if (/^\d*\.?\d?$/.test(raw)) {
                    updateDraft({ qtyDisplay: raw, qty: parseFloat(raw) || 0 });
                  }
                }}
                placeholder='1'
                style={{ width: '44px', textAlign: 'right' }}
              />
            </td>
            <td style={{ padding: '3px 2px' }}>
              <input
                type='number'
                value={draft.rate || ''}
                onChange={e => updateDraft({ rate: parseFloat(e.target.value) || 0 })}
                placeholder='0'
                style={{ width: '64px', textAlign: 'right' }}
              />
            </td>
            <td style={{ textAlign: 'right', fontSize: '12px', padding: '3px 4px', whiteSpace: 'nowrap', opacity: 0.4 }}>
              ${(draft.qty * draft.rate).toFixed(2)}
            </td>
            <td style={{ textAlign: 'center' }}>
              <button
                onClick={commitDraft}
                className='button'
                title='Add to invoice'
                style={{ fontSize: '24px', fontWeight: '200', padding: '5px 10px', lineHeight: '24px' }}
              >+</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ paddingTop: '8px', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
        <span>Subtotal</span>
        <strong>${subtotal.toFixed(2)}</strong>
      </div>

      <div style={{ paddingTop: '8px', borderTop: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div className='flex-center-spacebetween'>
          <span style={{ fontSize: '13px' }}>Adjustments</span>
          <div className='flex-center-end' style={{ gap: '6px' }}>
            <span style={{ fontSize: '12px', opacity: 0.5 }}>−</span>
            <input
              type='number'
              value={fields.adjustments ?? ''}
              onChange={e => onFieldChange('adjustments', e.target.value)}
              placeholder='0.00'
              style={{ width: '80px', textAlign: 'right' }}
            />
          </div>
        </div>
        <input
          value={fields.adjustmentsDesc}
          onChange={e => onFieldChange('adjustmentsDesc', e.target.value)}
          placeholder='Adjustment description…'
          style={{ width: '100%', fontSize: '12px' }}
        />
      </div>

      <div style={{ paddingTop: '8px', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
        <strong>Total</strong>
        <strong>${(subtotal - (parseFloat(String(fields.adjustments)) || 0)).toFixed(2)}</strong>
      </div>
    </>
  );
}