// Client-side file → text for the scanner. PDF via unpdf (pdf.js build), Word
// (.docx) via mammoth's browser build, plain .txt directly. Everything runs in
// the browser — the document never leaves the user's machine, and there is NO
// OCR: a scanned/image PDF yields little or no text, and the caller surfaces
// that honestly (paste instead) rather than guessing a verdict from garbage.
import { extractPdfText } from './pdf-extract'

export interface Extraction { text: string; kind: 'pdf' | 'docx' | 'txt' }

export async function extractFileText(file: File): Promise<Extraction> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.docx') || file.type.includes('officedocument.wordprocessingml')) {
    // @ts-ignore — mammoth's browser bundle ships no types; we only need extractRawText
    const mammoth: any = await import('mammoth/mammoth.browser')
    const extract = mammoth.extractRawText ?? mammoth.default?.extractRawText
    const { value } = await extract({ arrayBuffer: await file.arrayBuffer() })
    return { text: value ?? '', kind: 'docx' }
  }

  if (name.endsWith('.txt') || file.type === 'text/plain') {
    return { text: await file.text(), kind: 'txt' }
  }

  // Default → PDF (selectable-text only; scanned/image PDFs return ~nothing).
  return { text: await extractPdfText(await file.arrayBuffer()), kind: 'pdf' }
}
