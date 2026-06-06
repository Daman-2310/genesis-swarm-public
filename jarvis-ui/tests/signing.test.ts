import { describe, it, expect } from 'vitest'
import { signMessage, verifyMessage, publicKeyPem } from '@/lib/signing'

describe('Ed25519 signing', () => {
  it('produces a verifiable signature over a message', () => {
    const sig = signMessage('merkle:abc123')
    expect(sig.alg).toBe('Ed25519')
    expect(verifyMessage('merkle:abc123', sig.signature, sig.publicKeyPem)).toBe(true)
  })
  it('rejects a tampered message', () => {
    const sig = signMessage('merkle:abc123')
    expect(verifyMessage('merkle:TAMPERED', sig.signature, sig.publicKeyPem)).toBe(false)
  })
  it('rejects a tampered signature', () => {
    const sig = signMessage('merkle:abc123')
    const bad = Buffer.from(sig.signature, 'base64'); bad[0] ^= 0xff
    expect(verifyMessage('merkle:abc123', bad.toString('base64'), sig.publicKeyPem)).toBe(false)
  })
  it('publishes a stable PEM public key', () => {
    expect(publicKeyPem()).toContain('BEGIN PUBLIC KEY')
    expect(signMessage('x').publicKeyPem).toBe(publicKeyPem())
  })
})
