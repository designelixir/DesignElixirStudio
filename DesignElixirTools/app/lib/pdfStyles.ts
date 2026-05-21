import { StyleSheet, Font } from '@react-pdf/renderer';

// Register all weights you want to use
Font.register({
  family: 'Greycliff-CF',
  fonts: [
    { src: '/fonts/GreycliffCF-Regular.woff', fontWeight: 400 },
    { src: '/fonts/GreycliffCF-Medium.woff', fontWeight: 500 },
    { src: '/fonts/GreycliffCF-Demi Bold.woff', fontWeight: 600 },
    { src: '/fonts/GreycliffCF-Bold.woff', fontWeight: 700 },
  ]
});

export const pdfStyles = StyleSheet.create({
  page: {fontFamily: 'Greycliff-CF', fontWeight: '400',  fontSize: 10, color: '#222', paddingBottom: 0 },

  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: '100px', backgroundColor: '#333399', padding: '15px 40px'},
  headerLabel: {color: '#fff', fontSize: 32, fontWeight: '700'},
  headerSublabel: {color: '#fff', fontSize: 12, opacity: '0.5'},
  headerImage: { width: '150px', height: '70px' },

  // ── Body padding wrapper ──
  body: { padding: '40px' },

  // ── Invoice date ──
  invoiceDate: { fontSize: 12, fontFamily: 'Greycliff-CF', marginBottom: 16 },
  invoiceNumber: { fontSize: 9, color: '#888', marginTop: 2 },

  // ── Bill To / From ──
  parties: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  partyLabel: { fontSize: 9, fontWeight: 600, fontFamily: 'Greycliff-CF', color: '#333', marginBottom: 4 },
  partyCompany: { fontSize: 13, fontFamily: 'Greycliff-CF', color: '#3366CC', marginBottom: 2 },
  partyName: { fontSize: 10, color: '#333', marginBottom: 1 },
  partyDetail: { fontSize: 9, color: '#555', lineHeight: 1.5 },

  // ── Billing Summary label ──
  sectionTitle: { fontSize: 14, fontWeight: 700, fontFamily: 'Greycliff-CF', color: '#333399', marginBottom: 8 },

  // ── Table ──
  
  tableWrapper: { marginBottom: 20, border: '0.5px solid #eee', },
  tableHeader: { flexDirection: 'row', backgroundColor: '#333399', padding: '6px 8px' },
  tableHeaderText: { fontSize: 8, fontFamily: 'Greycliff-CF', color: 'white', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row',  paddingVertical: 6, paddingHorizontal: 8, minHeight: '25px' },
  tableRowAlt: { backgroundColor: '#f0f3fb' },
  tableEmpty: { padding: 20, textAlign: 'center', color: '#bbb', fontSize: 9 },
  col10: { width: '10%', fontSize: 9, textAlign: 'right' },
  col45: { width: '45%', fontSize: 9 },
  col15: { width: '15%', fontSize: 9, textAlign: 'right' },
  col15bold: { width: '15%', fontSize: 9, textAlign: 'right', fontWeight: 600 },
  col20: { width: '20%', fontSize: 9, textAlign: 'right' },

  // ── Bottom: notes + totals ──
  bottom: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  noteLabel: { fontSize: 8, fontFamily: 'Greycliff-CF', color: '#333399', marginBottom: 4 },
  noteText: { fontSize: 9, color: '#555', lineHeight: 1.6 },

  // ── Totals ──
  totalsBox: { width: 220 },
  notesBox: { width: 200},
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontSize: 9, maxWidth: '200px' },
  totalsRowLabel: { color: '#333399', fontSize: 9 },
  totalsFinalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTop: '0.5px solid #eee', maxWidth: '200px' },
  totalsFinalLabel: { fontSize: 12, fontFamily: 'Greycliff-CF', color: '#333399', fontWeight: 700 },
  totalsFinalValue: { fontSize: 14, fontFamily: 'Greycliff-CF', fontWeight: 700 },
  balanceDueRow: { flexDirection: 'row', justifyContent: 'space-between', maxWidth: '200px' },
  balanceDueLabel: { fontSize: 9, color: '#333399' },
  balanceDueValue: { fontSize: 9 },

  // ── Paid badge ──
  paidBadge: { borderWidth: 3, borderColor: '#22a06b', borderRadius: 4, padding: '4px 12px', marginTop: 10, alignSelf: 'flex-end' },
  paidText: { fontSize: 16, fontFamily: 'Greycliff-CF', color: '#22a06b', letterSpacing: 4 },

  // ── Payment section ──
  paymentSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTop: '0.5px solid #ddd' },
  paymentLeft: { width: '48%' },
  paymentRight: { width: '48%' },
  paymentTitle: { fontSize: 9, fontFamily: 'Greycliff-CF', color: '#333399', marginBottom: 6 },
  paymentDetail: { fontSize: 9, color: '#555', marginBottom: 2 },
  paymentNote: { fontSize: 8, color: '#999', marginTop: 4 },
  payOnlineButton: { backgroundColor: '#3366CC', color: 'white', padding: '6px 14px', borderRadius: 4, fontSize: 9, fontFamily: 'Greycliff-CF', textDecoration: 'none', marginBottom: 10, alignSelf: 'flex-start' },

  // ── Footer bar ──
  footerBar: { backgroundColor: '#333399', padding: '10px 40px' },
  footerText: { fontSize: 8, color: 'white', textAlign: 'center', lineHeight: 1.6 },
  footerCopy: { fontSize: 8, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 4 },
});