'use client';

import { useState } from 'react';
import Image from 'next/image';

interface CopyPasteProps {
  value: string;
  buttonText?: string;
  showIcon?: boolean;
  iconSrc?: string;
  className?: string;
  successDuration?: number;
}

export default function CopyPaste({ 
  value, 
  buttonText,
  showIcon = true,
  successDuration = 2000
}: CopyPasteProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), successDuration);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button onClick={handleCopy} className="icon-button" >
      {showIcon && (
        <Image src="/copy.png" width={15} height={15} alt="copy paste icon"></Image>
      )}
      
      {copied && !buttonText && (
        <p className='small-text no-text-spacing black-text'>✓</p>
      )}
    </button>
  );
}