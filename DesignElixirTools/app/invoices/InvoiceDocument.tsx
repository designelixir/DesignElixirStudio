import dynamic from 'next/dynamic';
import { Document, Page, Text, View, Image as PDFImage, Link } from '@react-pdf/renderer';
import { pdfStyles as s } from '@/app/lib/pdfStyles';
import { InvoiceFields, PDFLineItem } from '../types/globalTypes';
import NextLink from 'next/link';

function fmtDate(str: string) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function InvoiceDocument({ fields, items }: { fields: InvoiceFields; items: PDFLineItem[] }) {
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.rate, 0);
  const adjustments = parseFloat(String(fields.adjustments)) || 0;
  const total = subtotal - adjustments;
  const visibleItems = items.length >= 5 ? items : [
    ...items,
    ...Array.from({ length: 5 - items.length }, (_, i) => ({
      id: -i,
      desc: '',
      qty: 0,
      qtyDisplay: '',
      rate: 0,
      type: 'other' as const,
    }))
  ];


  return (
    <Document>
      <Page size="LETTER" style={s.page}>

        {/* ── Header image ── */}
        <View style={s.header}>
            <View>
                <Text style={s.headerLabel}>Project Invoice</Text>
            </View>
            <PDFImage src="/DE-Full-Logo.png" style={s.headerImage} />
        </View>

        <View style={s.body}>

          {/* ── Invoice date + number ── */}
          <Text style={s.invoiceDate}>{fmtDate(fields.invDate)}</Text>
          

          {/* ── Bill To / From ── */}
          <View style={s.parties}>
            <View style={{ width: '48%' }}>
              <Text style={s.sectionTitle}>Bill To:</Text>
              <Text style={s.partyCompany}>{fields.invProject || fields.toName || '—'}</Text>
              <Text style={s.partyName}>{fields.toName}</Text>
              {fields.toEmail ? <Text style={s.partyDetail}>{fields.toEmail}</Text> : null}
              {fields.toPhone ? <Text style={s.partyDetail}>{fields.toPhone}</Text> : null}
            </View>
            <View style={{ width: '48%' }}>
              <Text style={s.sectionTitle}>From:</Text>
               <Text style={s.partyCompany}>{fields.fromName}</Text>
              <Text style={s.partyName}>Megan Byers</Text>
              <Text style={s.partyDetail}>{fields.fromEmail}</Text>
              <Text style={s.partyDetail}>{fields.fromPhone}</Text>
            </View>
          </View>

          {/* ── Billing Summary ── */}
          <View>
            <Text style={s.sectionTitle}>Billing Summary</Text>
            <View style={s.tableWrapper}>
                <View style={s.tableHeader}>
                    <Text style={[s.tableHeaderText, s.col45]}>Description</Text>
                    <Text style={[s.tableHeaderText, s.col15]}>Type</Text>
                    <Text style={[s.tableHeaderText, s.col10]}>Qty</Text>
                    <Text style={[s.tableHeaderText, s.col15]}>Price</Text>
                    <Text style={[s.tableHeaderText, s.col15]}>Total</Text>
                </View>
                {visibleItems.map((item, i) => (
                <View key={item.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                  <Text style={s.col45}>{item.desc || ''}</Text>
                  <Text style={s.col15}>{item.desc || item.rate > 0 ? item.type : ''}</Text>
                  <Text style={s.col10}>{item.desc || item.rate > 0 ? (item.qtyDisplay ?? item.qty) : ''}</Text>
                  <Text style={s.col15}>{item.rate > 0 ? fmt(item.rate) : ''}</Text>
                  <Text style={s.col15bold}>{item.rate > 0 ? fmt(item.qty * item.rate) : ''}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Notes + Totals ── */}
          <View style={s.bottom}>
            
            <View style={s.paymentLeft}>
                <View style={s.totalsRow}>
                    <Text style={s.totalsRowLabel}>Subtotal</Text>
                    <Text>{fmt(subtotal)}</Text>
                </View>
                <View style={s.totalsRow}>
                    <Text style={s.totalsRowLabel}>
                        {fields.adjustmentsDesc ? `Adjustment (${fields.adjustmentsDesc})` : 'Adjustment'}
                    </Text>
                    <Text>−{fmt(adjustments)}</Text>
                </View>
                <View style={s.totalsFinalRow}>
                    <Text style={s.sectionTitle}>Invoice Total</Text>
                    <Text style={s.totalsFinalValue}>{fmt(total)}</Text>
                </View>
                <View style={s.balanceDueRow}>
                    <Text style={s.balanceDueLabel}>Balance Due By</Text>
                    <Text style={s.balanceDueValue}>{fmtDate(fields.invDue)}</Text>
                </View>
                
            </View>
            <View style={s.paymentRight}>
              {fields.notes ? (
                <>
                  <Text style={s.noteLabel}>Notes:</Text>
                  <Text style={s.noteText}>{fields.notes}</Text>
                </>
              ) : null}
              {fields.paid && (
                    <View style={s.paidBadge}>
                    <Text style={s.paidText}>PAID</Text>
                    </View>
                )}
            </View>
          </View>

          {/* ── Payment section ── */}
          <View style={s.paymentSection}>
            <View style={s.paymentLeft}>
              <Link src="https://buy.stripe.com/8wMbKgfWIbAsbpmcMN" style={s.payOnlineButton}>
                Click here to Pay Online
              </Link>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <PDFImage src="/paypal-icon.png" style={{ width: 18.8159, height: 5 }} />
                <Text style={s.paymentDetail}> — mrbyers54@gmail.com</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <PDFImage src="/venmo-icon.png" style={{ width: 26.2577, height: 5 }} />
                <Text style={s.paymentDetail}> — @mrbyers54</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <PDFImage src="/zelle-icon.png" style={{ width: 18.5465, height: 8 }} />
                <Text style={s.paymentDetail}> * — (303) 960-1941</Text>
              </View>
              <Text style={s.paymentNote}>*Preferred Method</Text>
            </View>

            <View style={s.paymentRight}>
              <Text style={s.paymentTitle}>Please make all checks payable to:</Text>
              <Text style={s.paymentDetail}>Megan Byers</Text>
              {fields.fromAddress.split('\n').map((line, i) => (
                <Text key={i} style={s.paymentDetail}>{line}</Text>
              ))}
            </View>
          </View>

        </View>

        {/* ── Footer bar ── */}
        <View style={s.footerBar}>
            <Link src="https://g.page/r/CRxf1Uat2mL_EAg/review" style={s.footerText}>
                Happy with your services? Click here to leave a review for Design Elixir on Google. Thanks!
              </Link>
          <Text >
            
          </Text>
          <Text style={s.footerCopy}>Copyright Design Elixir {new Date().getFullYear()} ©</Text>
        </View>

      </Page>
    </Document>
  );
}