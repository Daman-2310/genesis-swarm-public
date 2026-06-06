import { describe, it, expect } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { extractPdfText } from '@/lib/pdf-extract'
import { extractDocument, scanCompliance, SAMPLE_PROSPECTUS } from '@/lib/scan-engine'

// End-to-end: real PDF bytes -> unpdf text extraction -> deterministic scan.
async function makePdf(text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const page = doc.addPage([595, 842]) // A4
  const size = 10
  let y = 800
  for (const line of text.split('\n')) {
    page.drawText(line, { x: 40, y, size, font })
    y -= size + 4
  }
  return doc.save()
}

describe('PDF prospectus ingestion -> compliance scan', () => {
  it('extracts text from a real PDF and flags the leverage breach', async () => {
    const pdfBytes = await makePdf(SAMPLE_PROSPECTUS)
    const text = await extractPdfText(pdfBytes)
    expect(text.toLowerCase()).toContain('leverage')

    const doc = extractDocument(text)
    expect(doc.declaredLeverageCapPct).toBe(200)

    const res = scanCompliance(doc)
    expect(res.compliant).toBe(false)
    const lev = res.findings.find(f => f.code === 'PROSPECTUS_LEVERAGE_EXCEEDS_STATUTE')
    expect(lev?.severity).toBe('critical')
  }, 30_000)
})
