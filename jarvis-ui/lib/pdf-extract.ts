// Extract plain text from a PDF prospectus so the deterministic compliance
// scanner can read a real fund document, not just pasted text. Uses unpdf
// (a serverless/browser build of pdf.js); imported lazily so it never bloats
// the initial bundle. Works in the browser and in Node (used by the test).

export async function extractPdfText(data: ArrayBuffer | Uint8Array): Promise<string> {
  const { getDocumentProxy, extractText } = await import('unpdf')
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const pdf = await getDocumentProxy(bytes)
  const { text } = await extractText(pdf, { mergePages: true })
  return Array.isArray(text) ? text.join('\n') : text
}
