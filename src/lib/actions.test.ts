import { describe, expect, it, vi } from 'vitest';
import { nativeToScVal, StrKey } from '@stellar/stellar-sdk';
import { createdInvoiceId, prepareAction } from './actions';
import type { ContractClient } from './contract';
import type { Invoice, Receipt } from './invoice';
const freelancer = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 1));
const payer = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 3));
const invoice: Invoice = { id: 1n, freelancer, token: StrKey.encodeContract(Buffer.alloc(32, 2)), amount: 100n, paid_total: 80n, refunded_total: 10n, due_at: 9999999999n, client_opt: null, details_hash: new Uint8Array(32), cancelled: false };
const receipt: Receipt = { invoice_id: 1n, amount: 100n, paid_total: 80n, refunded_total: 10n, status: 'Open', payments: [{ payer, paid: 80n, refunded: 10n }] };
const client = { preparePay: vi.fn(), prepareRefund: vi.fn(), prepareCancel: vi.fn() } as unknown as ContractClient;
describe('invoice action intent', () => {
  it('does not prepare an overpayment', () => expect(() => prepareAction(client, 'pay', payer, invoice, receipt, '31', '')).toThrow('exceeds'));
  it('builds partial payment using the connected payer', async () => {
    await prepareAction(client, 'pay', payer, invoice, receipt, '30', '')();
    expect(client.preparePay).toHaveBeenCalledWith({ source: payer, invoiceId: 1n, amount: 30n });
  });
  it('requires the freelancer for refunds and bounds each payer balance', () => {
    expect(() => prepareAction(client, 'refund', payer, invoice, receipt, '1', payer)).toThrow('Only the freelancer');
    expect(() => prepareAction(client, 'refund', freelancer, invoice, receipt, '71', payer)).toThrow('exceeds');
  });
  it('allows refund after due date', async () => {
    await prepareAction(client, 'refund', freelancer, { ...invoice, due_at: 0n }, receipt, '70', payer)();
    expect(client.prepareRefund).toHaveBeenCalledWith({ source: freelancer, invoiceId: 1n, payer, amount: 70n });
  });
  it('never cancels an invoice with gross payment history, even when fully refunded', () => expect(() => prepareAction(client, 'cancel', freelancer, { ...invoice, refunded_total: 80n }, receipt, '', '')).toThrow('unpaid'));
  it('only exposes positive u64 IDs returned by the contract', () => {
    expect(createdInvoiceId(nativeToScVal(7n, { type: 'u64' }))).toBe('7');
    expect(createdInvoiceId(nativeToScVal(0n, { type: 'u64' }))).toBeNull();
    expect(createdInvoiceId(nativeToScVal('bad'))).toBeNull();
  });
});
