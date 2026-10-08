import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Field } from '../components/Field';
import { ErrorNotice } from '../components/ErrorNotice';
import { TransactionResult } from '../components/TransactionResult';
import { useAction } from '../hooks/useAction';
import type { WalletController } from '../hooks/useWallet';
import type { ContractClient, SubmitResult } from '../lib/contract';
import { defaultDueDate, formatDateTime } from '../lib/datetime';
import { formatAmount } from '../lib/amount';
import { parseCreate, parseId } from '../lib/forms';
import { createdInvoiceId, prepareAction } from '../lib/actions';
import { runWrite } from '../lib/flow';
import { remaining, paymentBlock, type Invoice, type Receipt } from '../lib/invoice';
import type { AppConfig } from '../lib/network';
import { bytesToHex, REFERENCE_HINT, REFERENCE_WARNING } from '../lib/reference';

type View = 'lookup' | 'create';
type RecordResult = { invoice: Invoice; receipt: Receipt };
export function Workspace({ wallet, client, config }: { wallet: WalletController; client: ContractClient; config: AppConfig }) {
  const [view, setView] = useState<View>('lookup');
  const [id, setId] = useState('');
  const [amount, setAmount] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [payer, setPayer] = useState('');
  const [fields, setFields] = useState({ token: '', amount: '', dueAt: defaultDueDate(), client: '', reference: '' });
  const read = useAction<RecordResult>();
  const write = useAction<SubmitResult>();
  const alive = useRef(true);
  const [createdId, setCreatedId] = useState<string | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const assertCurrent = () => { if (!alive.current) throw new Error('Your wallet session changed. Reconnect before continuing.'); };
  const busy = read.busy || write.busy;
  const canWrite = wallet.address !== null && wallet.onTestnet === true && !busy;
  const record = read.result;
  const invoice = record?.invoice;
  const block = invoice && wallet.address ? paymentBlock(invoice, wallet.address) : null;
  const isFreelancer = invoice !== undefined && invoice.freelancer === wallet.address;

  async function lookup(event: FormEvent) {
    event.preventDefault();
    if (!wallet.address || busy) return;
    const source = wallet.address;
    await read.run(async () => { const invoiceId = parseId(id); const [invoice, receipt] = await Promise.all([client.getInvoice(source, invoiceId), client.getReceipt(source, invoiceId)]); return { invoice, receipt }; });
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!canWrite || !wallet.address) return;
    const source = wallet.address;
    setCreatedId(null);
    const result = await write.run(async () => {
      const values = parseCreate(fields);
      return runWrite(client, source, config.passphrase, () => client.prepareCreate({ source, ...values }), assertCurrent);
    });
    if (result?.returnValue) {
      setCreatedId(createdInvoiceId(result.returnValue));
    }
  }
  async function transact(kind: 'pay' | 'refund' | 'cancel', event: FormEvent) {
    event.preventDefault();
    if (!canWrite || !wallet.address || !invoice || !record) return;
    const source = wallet.address;
    await write.run(async () => {
      const prepare = prepareAction(client, kind, source, invoice, record.receipt, kind === 'refund' ? refundAmount : amount, payer);
      return runWrite(client, source, config.passphrase, prepare, assertCurrent);
    });
    // A submitted action makes the displayed balance stale. Require a fresh lookup.
    read.reset();
  }
  function changeId(value: string) { setId(value); read.reset(); write.reset(); }
  function changeView(next: View) { if (busy) return; setView(next); read.reset(); write.reset(); setCreatedId(null); }

  return <section className="workspace" aria-label="Invoice workspace"><nav className="tabs" aria-label="Invoice tasks"><button type="button" aria-pressed={view === 'lookup'} disabled={busy} onClick={() => changeView('lookup')}>Find an invoice</button><button type="button" aria-pressed={view === 'create'} disabled={busy} onClick={() => changeView('create')}>Create an invoice</button></nav>{wallet.address === null && <p className="notice">Connect a testnet wallet above to read an invoice or send a transaction. Keep your secret key and seed phrase in your wallet.</p>}{wallet.address !== null && wallet.onTestnet !== true && <p className="notice">Sending is disabled until your wallet reports the testnet network.</p>}
    {view === 'create' ? <form onSubmit={(event) => void create(event)} aria-labelledby="create-heading"><h2 id="create-heading">Record an invoice</h2><p>Keep the invoice document off-chain. The connected wallet is the freelancer receiving payment.</p><Field id="token" label="Token contract address" value={fields.token} onChange={(token) => setFields({ ...fields, token })} required disabled={busy} mono hint="Use a testnet SEP-41 token contract. The app does not check token decimals or trustlines." /><Field id="total" label="Total amount in smallest token units" value={fields.amount} onChange={(amount) => setFields({ ...fields, amount })} required disabled={busy} inputMode="numeric" hint="Whole units only. For a 7-decimal token, 10,000,000 units means 1 token. Verify your token’s decimals separately." /><Field id="due" label="Payment due date" type="datetime-local" value={fields.dueAt} onChange={(dueAt) => setFields({ ...fields, dueAt })} required disabled={busy} hint="Your local time zone. Payments stop after this deadline; refunds remain available." /><Field id="client" label="Allowed payer address (optional)" value={fields.client} onChange={(client) => setFields({ ...fields, client })} disabled={busy} mono hint="Leave empty to allow any account to pay. Enter only a public G address." /><Field id="reference" label="Opaque document hash" value={fields.reference} onChange={(reference) => setFields({ ...fields, reference })} required disabled={busy} mono hint={<>{REFERENCE_HINT} {REFERENCE_WARNING}</>} /><button disabled={!canWrite}>{write.busy ? 'Waiting for confirmation…' : 'Create invoice'}</button>{createdId !== null && <p className="notice" role="status">Created invoice ID: <strong>{createdId}</strong>. Use this ID to find its receipt.</p>}</form> : <><form onSubmit={(event) => void lookup(event)} className="lookup"><h2>Find a payment record</h2><Field id="invoice-id" label="Invoice ID" value={id} onChange={changeId} required inputMode="numeric" disabled={busy} hint="The numeric ID returned when the invoice was created." /><button disabled={wallet.address === null || busy}>{read.busy ? 'Reading invoice…' : 'Look up invoice'}</button></form>{record && invoice && <section className="record" aria-labelledby="record-title"><div className="record-heading"><h2 id="record-title">Invoice {invoice.id.toString()}</h2><span className="badge">{record.receipt.status}</span></div><dl><div><dt>Total</dt><dd>{formatAmount(invoice.amount)} units</dd></div><div><dt>Remaining</dt><dd>{formatAmount(remaining(invoice))} units</dd></div><div><dt>Paid / refunded</dt><dd>{formatAmount(invoice.paid_total)} / {formatAmount(invoice.refunded_total)} units</dd></div><div><dt>Due</dt><dd>{formatDateTime(invoice.due_at)}</dd></div><div><dt>Freelancer</dt><dd className="mono">{invoice.freelancer}</dd></div><div><dt>Token</dt><dd className="mono">{invoice.token}</dd></div><div><dt>Allowed payer</dt><dd className="mono">{invoice.client_opt ?? 'Any account'}</dd></div><div><dt>Document hash</dt><dd className="mono">{bytesToHex(invoice.details_hash)}</dd></div></dl><h3>Payer receipt</h3>{record.receipt.payments.length === 0 ? <p>No payments recorded.</p> : <ul className="payments">{record.receipt.payments.map((payment) => <li key={payment.payer}><span className="mono">{payment.payer}</span><span>Paid {formatAmount(payment.paid)}; refunded {formatAmount(payment.refunded)} units</span></li>)}</ul>}{block && <p className="notice">{block}</p>}<form onSubmit={(event) => void transact('pay', event)}><h3>Pay this invoice</h3><Field id="payment" label="Payment amount in smallest token units" value={amount} onChange={setAmount} disabled={busy} required inputMode="numeric" /><button disabled={!canWrite || block !== null}>Pay invoice</button></form>{isFreelancer && <div className="management"><form onSubmit={(event) => void transact('refund', event)}><h3>Refund a payer</h3><p>Refunds come from your own token balance and require your wallet signature.</p><Field id="refund-payer" label="Payer public address" value={payer} onChange={setPayer} required disabled={busy} mono /><Field id="refund-amount" label="Refund amount in smallest token units" value={refundAmount} onChange={setRefundAmount} required disabled={busy} inputMode="numeric" /><button disabled={!canWrite}>Refund payer</button></form><form onSubmit={(event) => void transact('cancel', event)}><h3>Cancel an unpaid invoice</h3><p>Cancellation is permanent and only possible before any payment has ever been made.</p><button className="secondary" disabled={!canWrite || invoice.paid_total !== 0n || invoice.cancelled}>Cancel invoice</button></form></div>}</section>}</>}
    {read.error && <ErrorNotice error={read.error} />}{write.error && <><ErrorNotice error={write.error} />{write.error.transactionHash && <TransactionResult hash={write.error.transactionHash} explorerBaseUrl={config.explorerBaseUrl} label="Inspect transaction status before retrying" />}</>}{write.result && <><TransactionResult hash={write.result.hash} explorerBaseUrl={config.explorerBaseUrl} label="Transaction confirmed on testnet" /><p className="hint">Look up the invoice again to refresh its balance and receipt before sending another action.</p></>}
  </section>;
}
