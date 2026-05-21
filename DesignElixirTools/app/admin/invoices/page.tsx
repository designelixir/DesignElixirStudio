'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Invoice } from '@/app/admin/types/globalTypes';
import InvoiceList from './InvoiceList';
import Link from 'next/link';

export default function InvoicesPage() {


  return (
    <section className="basic-padding full-width">
      <div style={{ marginBottom: '20px' }}>
        <div className='flex-center-spacebetween full-width'>
        
          <Link href="/admin/projects" className="no-link-styling"><h1 className='no-text-spacing'>Invoices</h1></Link>
        
          <Link href="/admin/invoices/create">
            <button>Create Invoice</button>
          </Link>
        
      </div>
      </div>
      <InvoiceList />
    </section>
  );
}