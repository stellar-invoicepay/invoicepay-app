import { afterEach, describe, expect, it, vi } from 'vitest';
import { Account, Contract, StrKey, TransactionBuilder, rpc } from '@stellar/stellar-sdk';
import { ContractCallError, createContractClient } from './contract';
import { TESTNET_PASSPHRASE } from './network';
import { bytesToHex } from './reference';
const source = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 1));
const contractId = StrKey.encodeContract(Buffer.alloc(32, 2));
const tx = new TransactionBuilder(new Account(source, '0'), { fee: '100', networkPassphrase: TESTNET_PASSPHRASE }).addOperation(new Contract(contractId).call('cancel')).setTimeout(60).build();
const config = { network: 'testnet' as const, passphrase: TESTNET_PASSPHRASE, contractId, rpcUrl: 'https://rpc.example', explorerBaseUrl: 'https://stellar.expert/explorer/testnet' };
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
describe('submission uncertainty', () => {
  it('preserves the exact hash on network failure without retrying submission', async () => {
    const send = vi.spyOn(rpc.Server.prototype, 'sendTransaction').mockRejectedValue(new Error('connection lost'));
    const expected = bytesToHex(tx.hash());
    await expect(createContractClient(config).submit(tx.toXDR())).rejects.toMatchObject({ transactionHash: expected, message: expect.stringContaining('unknown') });
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('bounds submission time and retains the hash before any retry', async () => {
    vi.useFakeTimers();
    const send = vi.spyOn(rpc.Server.prototype, 'sendTransaction').mockImplementation(() => new Promise(() => {}));
    const outcome = createContractClient(config).submit(tx.toXDR()).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(15000);
    expect(await outcome).toBeInstanceOf(ContractCallError);
    expect(await outcome).toMatchObject({ transactionHash: bytesToHex(tx.hash()) });
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('returns only successful confirmed hashes', async () => {
    const hash = bytesToHex(tx.hash());
    vi.spyOn(rpc.Server.prototype, 'sendTransaction').mockResolvedValue({ status: 'PENDING', hash } as Awaited<ReturnType<rpc.Server['sendTransaction']>>);
    vi.spyOn(rpc.Server.prototype, 'pollTransaction').mockResolvedValue({ status: rpc.Api.GetTransactionStatus.SUCCESS } as Awaited<ReturnType<rpc.Server['pollTransaction']>>);
    expect(await createContractClient(config).submit(tx.toXDR())).toEqual({ hash });
  });
});
