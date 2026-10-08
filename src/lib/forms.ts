import { parsePositiveAmount } from './amount';
import { unixSecondsFromLocalInput } from './datetime';
import { validateReference } from './reference';
import { validateAccountAddress, validateContractAddress, validateInvoiceId } from './validation';

export interface CreateFields { token: string; amount: string; dueAt: string; client: string; reference: string }
export function parseCreate(fields: CreateFields, now = Date.now()) {
  const token = validateContractAddress(fields.token);
  const amount = parsePositiveAmount(fields.amount);
  const reference = validateReference(fields.reference);
  const due = unixSecondsFromLocalInput(fields.dueAt);
  const client = fields.client.trim() === '' ? null : validateAccountAddress(fields.client);
  if (!token.ok) throw new Error(token.message);
  if (!amount.ok) throw new Error(amount.message);
  if (!reference.ok) throw new Error(reference.message);
  if (due === null || due <= Math.floor(now / 1000)) throw new Error('Choose a future due date in your local time zone.');
  if (client !== null && !client.ok) throw new Error(client.message);
  return { token: token.value, amount: amount.value, dueAt: BigInt(due), client: client?.value ?? null, detailsHash: reference.bytes };
}
export function parseId(input: string): bigint {
  const result = validateInvoiceId(input);
  if (!result.ok) throw new Error(result.message);
  return result.value;
}
export function parseAmount(input: string): bigint {
  const result = parsePositiveAmount(input);
  if (!result.ok) throw new Error(result.message);
  return result.value;
}
export function parseAccount(input: string): string {
  const result = validateAccountAddress(input);
  if (!result.ok) throw new Error(result.message);
  return result.value;
}
