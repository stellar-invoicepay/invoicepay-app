import { describe, expect, it } from 'vitest';
import { nativeToScVal, StrKey } from '@stellar/stellar-sdk';
import { decodeInvoice, decodeReceipt, paymentBlock, remaining, type Invoice } from './invoice';
const address = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 1));
const invoice: Invoice = { id: 1n, freelancer: address, token: StrKey.encodeContract(Buffer.alloc(32, 2)), amount: 100n, paid_total: 70n, refunded_total: 20n, due_at: 1000n, client_opt: null, details_hash: new Uint8Array(32), cancelled: false };
describe('invoice state', () => {
  it('counts refunds in the remaining balance', () => expect(remaining(invoice)).toBe(50n));
  it('enforces cancellation, expiry, restriction and fully paid state', () => {
    expect(paymentBlock(invoice, address, 1000)).toBeNull();
    expect(paymentBlock(invoice, address, 1001)).toContain('due date');
    expect(paymentBlock({ ...invoice, cancelled: true }, address, 0)).toContain('cancelled');
    expect(paymentBlock({ ...invoice, client_opt: 'other' }, address, 0)).toContain('specified client');
    expect(paymentBlock({ ...invoice, paid_total: 120n }, address, 0)).toContain('fully paid');
  });
  it('decodes real ScVal invoice records and optional clients', () => {
    // Native-to-ScVal needs explicit integer types for contract u64/i128 fields.
    const fields = Object.fromEntries(Object.entries(invoice).map(([key, value]) => [key, value]));
    const encoded = nativeToScVal(fields, { type: { id: ['symbol', 'u64'], amount: ['symbol', 'i128'], paid_total: ['symbol', 'i128'], refunded_total: ['symbol', 'i128'], due_at: ['symbol', 'u64'] } });
    expect(decodeInvoice(encoded)).toEqual(invoice);
  });
  it('rejects malformed records rather than showing guessed payment state', () => {
    expect(() => decodeInvoice(nativeToScVal('bad'))).toThrow();
    expect(() => decodeReceipt(nativeToScVal({ status: ['Unknown'], payments: [] }))).toThrow();
  });
});
