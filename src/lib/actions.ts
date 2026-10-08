import { scValToNative, type xdr } from '@stellar/stellar-sdk';
import type { ContractClient, PreparedCall } from './contract';
import { parseAccount, parseAmount } from './forms';
import { paymentBlock, remaining, type Invoice, type Receipt } from './invoice';

export function createdInvoiceId(value: xdr.ScVal): string | null {
  const id: unknown = scValToNative(value);
  if (typeof id === 'bigint' && id > 0n && id < (1n << 64n)) return id.toString();
  if (typeof id === 'number' && Number.isSafeInteger(id) && id > 0) return String(id);
  return null;
}
export function prepareAction(client: ContractClient, kind: 'pay' | 'refund' | 'cancel', source: string, invoice: Invoice, receipt: Receipt, amount: string, payer: string): () => Promise<PreparedCall> {
  const invoiceId = invoice.id;
  if (kind === 'pay') {
    const blocked = paymentBlock(invoice, source);
    if (blocked) throw new Error(blocked);
    const value = parseAmount(amount);
    if (value > remaining(invoice)) throw new Error('The payment exceeds the invoice balance.');
    return () => client.preparePay({ source, invoiceId, amount: value });
  }
  if (kind === 'refund') {
    if (source !== invoice.freelancer) throw new Error('Only the freelancer can refund this invoice.');
    const address = parseAccount(payer);
    const value = parseAmount(amount);
    const line = receipt.payments.find((payment) => payment.payer === address);
    if (!line || value > line.paid - line.refunded) throw new Error('The refund exceeds this payer’s net payment.');
    return () => client.prepareRefund({ source, invoiceId, payer: address, amount: value });
  }
  if (source !== invoice.freelancer || invoice.paid_total !== 0n || invoice.cancelled) throw new Error('Only the freelancer can cancel an unpaid, open invoice.');
  return () => client.prepareCancel({ source, invoiceId });
}
