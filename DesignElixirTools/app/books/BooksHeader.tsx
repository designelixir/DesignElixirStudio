'use client';

import React from 'react';
import Link from 'next/link';

export interface Crumb {
  label: string;
  href: string;
}

interface BooksHeaderProps {
  // Pages above this one, e.g. [{ label: 'Books', href: '/books' }, { label: 'Accounts', href: '/books/accounts' }]
  crumbs?: Crumb[];
  title: React.ReactNode;    // this page's name (not a link)
  subtitle?: React.ReactNode; // small line(s) under the title
  actions?: React.ReactNode;  // buttons / controls on the right
}

export const BOOKS_CRUMB: Crumb = { label: 'Books', href: '/books' };

// Standard header for every /books page: breadcrumb links, title, optional
// subtitle and actions, then a rule
export default function BooksHeader({ crumbs = [BOOKS_CRUMB], title, subtitle, actions }: BooksHeaderProps) {
  return (
    <>
      <div className='flex-center-spacebetween flex-wrap' style={{ gap: '10px' }}>
        <div>
          <h1>
            {crumbs.map((c) => (
              <React.Fragment key={c.href}>
                <Link href={c.href}><strong>{c.label}</strong></Link>
                {' | '}
              </React.Fragment>
            ))}
            {title}
          </h1>
          {subtitle}
        </div>
        {actions && <div className='flex-center-end no-flex-grow flex-wrap'>{actions}</div>}
      </div>
      <hr></hr>
    </>
  );
}
