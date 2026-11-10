'use client';

import Image from 'next/image';
import { openReceipt } from './receipts';

// Receipt icon that opens the transaction's receipt in a new tab
export default function ReceiptButton({ path, fileName }: { path: string; fileName?: string | null }) {
  const label = `View receipt${fileName ? ` (${fileName})` : ''}`;
  return (
    <button
      type='button'
      className='icon-button'
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        openReceipt(path);
      }}
      style={{ verticalAlign: 'middle', lineHeight: 0 }}
    >
      <Image src='/receipt.svg' alt='' width={16} height={16} />
    </button>
  );
}
