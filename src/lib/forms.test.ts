import { describe, expect, it } from 'vitest';
import { StrKey } from '@stellar/stellar-sdk';
import { parseAccount, parseAmount, parseCreate, parseId } from './forms';
import { validateReference } from './reference';
import { resolveNetworkConfig, TESTNET_PASSPHRASE } from './network';
import { readFileSync } from 'node:fs';
import { CONTRACT_ERRORS, describeContractError, parseErrorTable } from './contractErrors';

const account = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 1));
const contract = StrKey.encodeContract(Buffer.alloc(32, 2));
const valid = { token: contract, amount: '10000000', dueAt: '2030-01-01T12:00', client: '', reference: 'ab'.repeat(32) };
describe('invoice inputs', () => {
  it('preserves bigint amounts, optional payer and exact opaque bytes', () => {
    const parsed = parseCreate(valid, 0);
    expect(parsed.amount).toBe(10000000n);
    expect(parsed.client).toBeNull();
    expect(parsed.detailsHash).toEqual(new Uint8Array(32).fill(171));
    expect(parseCreate({ ...valid, client: account }, 0).client).toBe(account);
  });
  it.each(['', '0', '-1', '1.2', 'hello', ((1n << 127n)).toString()])('rejects unsafe amount %s', (input) => expect(() => parseAmount(input)).toThrow());
  it('supports full i128 and u64 limits without losing precision', () => {
    expect(parseAmount(((1n << 127n) - 1n).toString())).toBe((1n << 127n) - 1n);
    expect(parseId(((1n << 64n) - 1n).toString())).toBe((1n << 64n) - 1n);
  });
  it.each(['', '0', '-1', '1.2', (1n << 64n).toString()])('rejects unsafe id %s', (input) => expect(() => parseId(input)).toThrow());
  it.each(['', 'not-a-date', '2000-01-01T12:00'])('rejects invalid or past due date %s', (dueAt) => expect(() => parseCreate({ ...valid, dueAt })).toThrow());
  it('rejects personal text in the document reference field', () => {
    expect(validateReference('client@example.com').ok).toBe(false);
    expect(validateReference('z'.repeat(64)).ok).toBe(false);
    expect(validateReference('A'.repeat(64)).ok).toBe(true);
  });
  it('requires the right public address kind', () => {
    expect(parseAccount(account)).toBe(account);
    expect(() => parseAccount(contract)).toThrow();
    expect(() => parseCreate({ ...valid, token: account }, 0)).toThrow();
  });
});
describe('testnet configuration', () => {
  it('fails closed with missing configuration and mainnet', () => {
    expect(resolveNetworkConfig({}).ok).toBe(false);
    expect(resolveNetworkConfig({ network: 'mainnet', rpcUrl: 'https://rpc.example', contractId: contract, explorerBaseUrl: 'https://stellar.expert/explorer/testnet' }).ok).toBe(false);
  });
  it('uses SDK testnet passphrase and validates real contract syntax', () => {
    const result = resolveNetworkConfig({ network: 'testnet', rpcUrl: 'https://rpc.example', contractId: contract, explorerBaseUrl: 'https://stellar.expert/explorer/testnet/' });
    expect(result.ok && result.config.passphrase).toBe(TESTNET_PASSPHRASE);
  });
});
describe('contract error source of truth', () => {
  const table = parseErrorTable(readFileSync(new URL('../../docs/contract-errors.md', import.meta.url), 'utf8'));
  it('covers all reviewed codes and exact wording', () => {
    expect(table).toHaveLength(11);
    for (const row of table) expect(CONTRACT_ERRORS[row.code]).toEqual({ variant: row.variant, message: row.message, nextAction: row.nextAction });
  });
  it('does not invent wording for unknown contract codes', () => expect(describeContractError('Error(Contract, #999)').message).toContain('Please report'));
  it('retains only well-formed public transaction hashes on transport failures', () => {
    expect(describeContractError({ message: 'Unknown submission', transactionHash: 'a'.repeat(64) })).toEqual({ message: 'Unknown submission', transactionHash: 'a'.repeat(64) });
    expect(describeContractError({ message: 'Unknown submission', transactionHash: 'bad' })).toEqual({ message: 'Unknown submission' });
  });
});
