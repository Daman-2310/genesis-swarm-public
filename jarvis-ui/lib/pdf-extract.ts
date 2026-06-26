// Extract text from a PDF prospectus so the deterministic compliance scanner
// can read a real fund document, not just pasted text. Uses unpdf (a
// serverless/browser build of pdf.js); imported lazily so it never bloats the
// initial bundle. Works in the browser and in Node (used by the tests).
//
// Two passes:
//   extractPdfText (default)  — LAYOUT-AWARE. Reconstructs lines and column
//     spacing from each text item's x/y geometry, so tables and multi-column
//     layouts keep their structure instead of collapsing into a flat wall of
//     text (the NOTE-02 failure mode — numbers detached from their labels).
//     Deterministic geometry only: no AI, no model, fully client-side. Falls
//     back to the flat pass if anything goes wrong or yields too little.
//   extractPdfFlatText — the original merged-text pass; kept as the fallback.

interface PdfTextItem {
  str: string
  transform: number[] // [scaleX, skewX, skewY, scaleY, x, y]
  width?: number
}

// Rebuild one page's text from positioned items, preserving rows and the
// horizontal gaps that carry table/column structure.
function reconstructLayout(items: PdfTextItem[]): string {
  const its = items.filter((i) => typeof i.str === 'string' && i.str.length > 0)
  if (!its.length) return ''

  // Representative glyph width = median of (item width / chars), used to turn a
  // horizontal gap into a sensible number of spaces.
  const glyphWidths = its
    .filter((i) => (i.width ?? 0) > 0 && i.str.length > 0)
    .map((i) => (i.width as number) / i.str.length)
    .sort((a, b) => a - b)
  const charW = glyphWidths.length ? glyphWidths[Math.floor(glyphWidths.length / 2)] : 4

  // Group items into rows by baseline y (PDF y grows upward).
  const yTol = 3
  const rows: { y: number; items: PdfTextItem[] }[] = []
  for (const it of its) {
    const y = it.transform[5]
    let row = rows.find((r) => Math.abs(r.y - y) <= yTol)
    if (!row) {
      row = { y, items: [] }
      rows.push(row)
    }
    row.items.push(it)
  }
  rows.sort((a, b) => b.y - a.y) // top (higher y) → bottom

  const lines: string[] = []
  for (const row of rows) {
    row.items.sort((a, b) => a.transform[4] - b.transform[4]) // left → right
    let line = ''
    let prevEnd = 0
    row.items.forEach((it, k) => {
      const x = it.transform[4]
      const w = it.width ?? it.str.length * charW
      if (k === 0) {
        line = it.str
      } else {
        const gap = x - prevEnd
        // Big gap → many spaces (preserve columns); small gap → a word space;
        // touching → join (parts of the same word).
        let spaces = 0
        if (gap > charW * 0.3) spaces = Math.min(Math.max(1, Math.round(gap / charW)), 10)
        line += ' '.repeat(spaces) + it.str
      }
      prevEnd = x + w
    })
    lines.push(line.replace(/[ \t]+$/, ''))
  }
  return lines.join('\n')
}

export async function extractPdfLayoutText(data: ArrayBuffer | Uint8Array): Promise<string> {
  const { getDocumentProxy } = await import('unpdf')
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const pdf = await getDocumentProxy(bytes)
  const pages: string[] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const items = (content.items as unknown[]).filter(
      (i): i is PdfTextItem => typeof (i as PdfTextItem).str === 'string',
    )
    pages.push(reconstructLayout(items))
  }
  return pages.join('\n\n')
}

// Original flat pass — fast, merges all pages; kept as the fallback.
export async function extractPdfFlatText(data: ArrayBuffer | Uint8Array): Promise<string> {
  const { getDocumentProxy, extractText } = await import('unpdf')
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const pdf = await getDocumentProxy(bytes)
  const { text } = await extractText(pdf, { mergePages: true })
  return Array.isArray(text) ? text.join('\n') : text
}

export async function extractPdfText(data: ArrayBuffer | Uint8Array): Promise<string> {
  // Read the bytes once; both passes need a fresh view.
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  try {
    const layout = await extractPdfLayoutText(bytes.slice())
    if (layout && layout.replace(/\s/g, '').length > 50) return layout
  } catch {
    // fall through to the flat pass
  }
  return extractPdfFlatText(bytes.slice())
}
