import { BASE_FEE, Contract, TransactionBuilder, rpc, xdr } from '@stellar/stellar-sdk';

import { decodeInvoice, decodeReceipt, type Invoice, type Receipt } from './invoice';
import type { AppConfig } from './network';
import { bytesToHex } from './reference';
import {
  addressToScVal,
  i128ToScVal,
  referenceToScVal,
  u64ToScVal,
} from './scval';

const RPC_TIMEOUT_MS = 15_000;
const RPC_MAX_RETRIES = 3;
const RPC_BACKOFF_BASE_MS = 500;

/**
 * Bounds a single RPC attempt: rejects if `promise` doesn't settle within
 * `ms`. The v17 SDK methods don't accept an `AbortSignal`, so the original
 * promise is left to settle silently in the background.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('the network timed out. Please try again.')), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeout]);
}

/**
 * Retries an RPC call with exponential backoff, bounded by RPC_MAX_RETRIES.
 * Only transient failures (timeouts, connection drops) trigger a retry —
 * contract errors arrive as structured results, not thrown errors.
 */
async function retryRpc<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RPC_MAX_RETRIES; attempt++) {
    try {
      return await withTimeout(fn(), RPC_TIMEOUT_MS);
    } catch (err) {
      lastError = err;
      if (attempt < RPC_MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RPC_BACKOFF_BASE_MS * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

/**
 * Talks to the deployed `invoicepay` contract over Stellar RPC.
 *
 * Every method name and argument order below matches `src/lib.rs` in
 * `invoicepay-contracts` one for one: `get_invoice(u64)`, `receipt(u64)`,
 * `create_invoice(Address, Address, i128, u64, Option<Address>, BytesN<32>)`,
 * `pay(u64, Address, i128)`, `cancel(u64)`, `refund(u64, Address, i128)`.
 *
 * Writes follow the standard Soroban flow: build, simulate, assemble the
 * simulation's footprint and fees, sign with the wallet, submit, poll. Contract
 * errors surface during simulation, which is what makes the mapping in
 * `contractErrors.ts` useful — by the time a transaction is submitted, the
 * contract's own validation has already passed.
 *
 * The browser-to-wallet flow still needs a manual demonstration. Deployment
 * alone does not establish that this browser flow has been exercised.
 */
export class ContractCallError extends Error {
  /** The raw host or RPC message, read back by `describeContractError`. */
  readonly raw: string;
  readonly transactionHash?: string;

  constructor(raw: string, transactionHash?: string) {
    super(raw);
    this.name = 'ContractCallError';
    this.raw = raw;
    this.transactionHash = transactionHash;
  }
}

export interface PreparedCall {
  /** Unsigned transaction XDR, ready for the wallet to sign. */
  readonly xdr: string;
}

export interface SubmitResult {
  /** The transaction hash — the receipt the user keeps. */
  readonly hash: string;
  /**
   * The contract's return value, when the call returned one. `create_invoice`
   * returns the new invoice id here, which is how the app can name the fee it just
   * created without reading events.
   */
  readonly returnValue?: xdr.ScVal;
}

export interface ContractClient {
  getInvoice(source: string, id: bigint): Promise<Invoice>;
  getReceipt(source: string, id: bigint): Promise<Receipt>;
  prepareCreate(input: { source: string; token: string; amount: bigint; dueAt: bigint; client: string | null; detailsHash: Uint8Array }): Promise<PreparedCall>;
  preparePay(input: { source: string; invoiceId: bigint; amount: bigint }): Promise<PreparedCall>;
  prepareRefund(input: { source: string; invoiceId: bigint; payer: string; amount: bigint }): Promise<PreparedCall>;
  prepareCancel(input: { source: string; invoiceId: bigint }): Promise<PreparedCall>;
  submit(signedXdr: string): Promise<SubmitResult>;
}

const ARCHIVED_MESSAGE =
  'This record has been archived by the network and must be restored before it can be used. ' +
  'This app cannot restore archived records yet.';

export function createContractClient(config: AppConfig): ContractClient {
  const server = new rpc.Server(config.rpcUrl);
  const contract = new Contract(config.contractId);

  /**
   * Builds the unsigned transaction. Reads and writes both need a source
   * account: the app uses the connected wallet's address and never holds a
   * secret key of its own.
   */
  async function buildTransaction(source: string, method: string, args: xdr.ScVal[]) {
    const account = await retryRpc(() => server.getAccount(source));
    return new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: config.passphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(60)
      .build();
  }

  /**
   * Simulates a call and, on success, returns the assembled transaction XDR.
   * Throws `ContractCallError` for a contract error, an archived record, or any
   * other simulation failure.
   */
  async function assemble(source: string, method: string, args: xdr.ScVal[]): Promise<string> {
    const tx = await buildTransaction(source, method, args);
    const simulation = await retryRpc(() => server.simulateTransaction(tx));

    if (rpc.Api.isSimulationRestore(simulation)) {
      // A record archived after nobody touched it for long enough. v0 has no
      // restore flow, so say that plainly instead of failing cryptically.
      throw new ContractCallError(ARCHIVED_MESSAGE);
    }
    if (rpc.Api.isSimulationError(simulation)) {
      throw new ContractCallError(simulation.error);
    }
    return rpc.assembleTransaction(tx, simulation).build().toXDR();
  }

  /** Simulates a read-only call and returns the raw return value. */
  async function read(source: string, method: string, args: xdr.ScVal[]): Promise<xdr.ScVal> {
    const tx = await buildTransaction(source, method, args);
    const simulation = await retryRpc(() => server.simulateTransaction(tx));

    if (rpc.Api.isSimulationRestore(simulation)) {
      throw new ContractCallError(ARCHIVED_MESSAGE);
    }
    if (rpc.Api.isSimulationError(simulation)) {
      throw new ContractCallError(simulation.error);
    }
    if (!rpc.Api.isSimulationSuccess(simulation) || simulation.result === undefined) {
      throw new ContractCallError(`the contract returned no result for ${method}`);
    }
    return simulation.result.retval;
  }

  return {
    async getInvoice(source, id) { return decodeInvoice(await read(source, 'get_invoice', [u64ToScVal(id)])); },
    async getReceipt(source, id) { return decodeReceipt(await read(source, 'receipt', [u64ToScVal(id)])); },
    async prepareCreate({source, token, amount, dueAt, client, detailsHash}) {
      return {xdr: await assemble(source, 'create_invoice', [addressToScVal(source), addressToScVal(token), i128ToScVal(amount), u64ToScVal(dueAt), client === null ? xdr.ScVal.scvVoid() : addressToScVal(client), referenceToScVal(detailsHash)])};
    },
    async preparePay({source, invoiceId, amount}) { return {xdr: await assemble(source, 'pay', [u64ToScVal(invoiceId), addressToScVal(source), i128ToScVal(amount)])}; },
    async prepareRefund({source, invoiceId, payer, amount}) { return {xdr: await assemble(source, 'refund', [u64ToScVal(invoiceId), addressToScVal(payer), i128ToScVal(amount)])}; },
    async prepareCancel({source, invoiceId}) { return {xdr: await assemble(source, 'cancel', [u64ToScVal(invoiceId)])}; },
    async submit(signedXdr) {
      const tx = TransactionBuilder.fromXDR(signedXdr, config.passphrase);
      const transactionHash = bytesToHex(tx.hash());
      let sent: Awaited<ReturnType<typeof server.sendTransaction>>;
      try {
        // An interrupted response may still represent an accepted transaction.
        // Never retry submission automatically; keep the exact hash to inspect.
        sent = await withTimeout(server.sendTransaction(tx), RPC_TIMEOUT_MS);
      } catch {
        throw new ContractCallError('Submission status is unknown. Check this transaction in the explorer before retrying.', transactionHash);
      }

      // `SendTransactionStatus` is a string union, not an enum, so these are
      // compared as literals (checked by the compiler against the SDK types).
      if (sent.status === 'ERROR') {
        throw new ContractCallError('The network rejected this transaction.', sent.hash);
      }
      if (sent.status === 'TRY_AGAIN_LATER') {
        throw new ContractCallError('The network is busy. Check this transaction before retrying.', sent.hash);
      }

      let result: Awaited<ReturnType<typeof server.pollTransaction>>;
      try { result = await retryRpc(() => server.pollTransaction(sent.hash)); }
      catch { throw new ContractCallError('Confirmation status is unknown. Check this transaction before retrying.', sent.hash); }
      if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return result.returnValue === undefined
          ? { hash: sent.hash }
          : { hash: sent.hash, returnValue: result.returnValue };
      }
      if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
        // The contract's own checks already ran during simulation, so a failure
        // here is not one of the codes in ERRORS.md. Report the hash rather than
        // inventing wording for it.
        throw new ContractCallError('This transaction failed on testnet.', sent.hash);
      }
      throw new ContractCallError(
        'This transaction was not confirmed in time. Check it before retrying.',
        sent.hash,
      );
    },
  };
}
