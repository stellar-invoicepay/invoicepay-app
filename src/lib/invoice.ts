import { scValToNative, type xdr } from '@stellar/stellar-sdk';

export interface Invoice {
  id: bigint; freelancer: string; token: string; amount: bigint;
  paid_total: bigint; refunded_total: bigint; due_at: bigint;
  client_opt: string | null; details_hash: Uint8Array; cancelled: boolean;
}
export interface Payment { payer: string; paid: bigint; refunded: bigint }
export interface Receipt {
  invoice_id: bigint; amount: bigint; paid_total: bigint;
  refunded_total: bigint; status: 'Open' | 'Paid' | 'Cancelled'; payments: Payment[];
}
function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unexpected contract record.');
  return value as Record<string, unknown>;
}
function integer(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
  throw new Error('Unexpected contract integer.');
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Unexpected contract address.');
  return value;
}
export function decodeInvoice(value: xdr.ScVal): Invoice {
  const r = object(scValToNative(value));
  if (!(r.details_hash instanceof Uint8Array) || r.details_hash.length !== 32 || typeof r.cancelled !== 'boolean') throw new Error('Unexpected invoice fields.');
  return {id: integer(r.id), freelancer: text(r.freelancer), token: text(r.token), amount: integer(r.amount), paid_total: integer(r.paid_total), refunded_total: integer(r.refunded_total), due_at: integer(r.due_at), client_opt: r.client_opt == null ? null : text(r.client_opt), details_hash: r.details_hash, cancelled: r.cancelled};
}
export function decodeReceipt(value: xdr.ScVal): Receipt {
  const r = object(scValToNative(value));
  const rawStatus: unknown = Array.isArray(r.status) ? r.status[0] : r.status;
  if (rawStatus !== 'Open' && rawStatus !== 'Paid' && rawStatus !== 'Cancelled') throw new Error('Unexpected invoice status.');
  if (!Array.isArray(r.payments) || r.payments.length > 250) throw new Error('Unexpected receipt payments.');
  return {invoice_id: integer(r.invoice_id), amount: integer(r.amount), paid_total: integer(r.paid_total), refunded_total: integer(r.refunded_total), status: rawStatus, payments: r.payments.map((v: unknown) => { const p=object(v); return {payer: text(p.payer), paid: integer(p.paid), refunded: integer(p.refunded)}; })};
}
export function remaining(invoice: Invoice): bigint { return invoice.amount - invoice.paid_total + invoice.refunded_total; }
export function paymentBlock(invoice: Invoice, payer: string, now = Math.floor(Date.now()/1000)): string | null {
  if (invoice.cancelled) return 'This invoice is cancelled.';
  if (invoice.due_at < BigInt(now)) return 'The due date has passed. Payments are closed; refunds remain available.';
  if (invoice.client_opt !== null && invoice.client_opt !== payer) return 'Only the specified client can pay this invoice.';
  if (remaining(invoice) <= 0n) return 'This invoice is fully paid.';
  return null;
}
