// Reads a PDF's text with pdf.js and groups it into rows, keeping each piece's
// x position so parsers can tell columns apart (date, description, amount...).

export interface PdfTextItem {
  x: number;
  str: string;
}

export interface PdfRow {
  page: number;
  y: number; // distance from the bottom of the page (bigger = higher up)
  items: PdfTextItem[]; // sorted left → right
  text: string; // all items joined with spaces
}

// Text pieces whose baselines are within this many points are on the same row
const ROW_TOLERANCE = 3;

// Groups positioned text into rows, top of page first. Exported separately so
// parsers can be tested with plain data.
export function groupIntoRows(page: number, raw: { x: number; y: number; str: string }[]): PdfRow[] {
  const rows: PdfRow[] = [];
  for (const piece of [...raw].sort((a, b) => b.y - a.y || a.x - b.x)) {
    if (!piece.str.trim()) continue;
    let row = rows.find((r) => Math.abs(r.y - piece.y) <= ROW_TOLERANCE);
    if (!row) {
      row = { page, y: piece.y, items: [], text: '' };
      rows.push(row);
    }
    row.items.push({ x: piece.x, str: piece.str.trim() });
  }
  for (const row of rows) {
    row.items.sort((a, b) => a.x - b.x);
    row.text = row.items.map((i) => i.str).join(' ');
  }
  return rows.sort((a, b) => b.y - a.y);
}

// Downloads the PDF at `url` and returns every row of text, page by page.
// Browser only: pdf.js is loaded on demand so it never runs on the server.
export async function extractPdfRows(url: string): Promise<PdfRow[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download the PDF (${response.status})`);
  const data = new Uint8Array(await response.arrayBuffer());

  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;
  const rows: PdfRow[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const raw = content.items.flatMap((item) =>
      'str' in item ? [{ x: item.transform[4], y: item.transform[5], str: item.str }] : []
    );
    rows.push(...groupIntoRows(p, raw));
  }
  await loadingTask.destroy();
  return rows;
}
