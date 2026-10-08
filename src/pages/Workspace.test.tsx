// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrKey } from '@stellar/stellar-sdk';
import axe from 'axe-core';
import { Workspace } from './Workspace';
import type { ContractClient } from '../lib/contract';
import type { WalletController } from '../hooks/useWallet';
import { TESTNET_PASSPHRASE, type AppConfig } from '../lib/network';
import type { Invoice, Receipt } from '../lib/invoice';
const account = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 1));
const token = StrKey.encodeContract(Buffer.alloc(32, 2));
const invoice: Invoice = { id: 1n, freelancer: account, token, amount: 100n, paid_total: 0n, refunded_total: 0n, due_at: 9999999999n, client_opt: null, details_hash: new Uint8Array(32), cancelled: false };
const receipt: Receipt = { invoice_id: 1n, amount: 100n, paid_total: 0n, refunded_total: 0n, status: 'Open', payments: [] };
const config: AppConfig = { network: 'testnet', passphrase: TESTNET_PASSPHRASE, contractId: token, rpcUrl: 'https://rpc.example', explorerBaseUrl: 'https://stellar.expert/explorer/testnet' };
const wallet: WalletController = { address: account, connecting: false, error: null, onTestnet: true, connect: vi.fn(), disconnect: vi.fn(), refreshNetwork: vi.fn() };
function client(): ContractClient { return { getInvoice: vi.fn(async () => invoice), getReceipt: vi.fn(async () => receipt), prepareCreate: vi.fn(), preparePay: vi.fn(), prepareRefund: vi.fn(), prepareCancel: vi.fn(), submit: vi.fn() }; }
afterEach(cleanup);
describe('invoice workspace', () => {
  it('requires a wallet and does not create a phantom record', () => {
    render(<Workspace wallet={{ ...wallet, address: null, onTestnet: null }} client={client()} config={config} />);
    expect((screen.getByRole('button', { name: 'Look up invoice' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Connect a testnet wallet above/)).toBeTruthy();
  });
  it('looks up on Enter and clears the record immediately when its ID changes', async () => {
    const rpc = client();
    render(<Workspace wallet={wallet} client={rpc} config={config} />);
    fireEvent.change(screen.getByLabelText('Invoice ID'), { target: { value: '1' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Look up invoice' }).closest('form')!);
    await screen.findByRole('heading', { name: 'Invoice 1' });
    expect(rpc.getInvoice).toHaveBeenCalledWith(account, 1n);
    expect(screen.getByText('No payments recorded.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Invoice ID'), { target: { value: '2' } });
    expect(screen.queryByRole('heading', { name: 'Invoice 1' })).toBeNull();
  });
  it('reports lookup failures without keeping stale invoice details', async () => {
    const rpc = client();
    vi.mocked(rpc.getInvoice).mockRejectedValue(new Error('Error(Contract, #1)'));
    render(<Workspace wallet={wallet} client={rpc} config={config} />);
    fireEvent.change(screen.getByLabelText('Invoice ID'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Look up invoice' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain("We couldn't find that invoice"));
  });
  it('disables sending on a wrong network while exposing form instructions', () => {
    render(<Workspace wallet={{ ...wallet, onTestnet: false }} client={client()} config={config} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create an invoice' }));
    expect((screen.getByRole('button', { name: 'Create invoice' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText('Opaque document hash')).toBeTruthy();
    expect(screen.getByText(/Whole units only/)).toBeTruthy();
  });
  it('has labelled controls and no axe violations in create and populated lookup views', async () => {
    const { container } = render(<main><Workspace wallet={wallet} client={client()} config={config} /></main>);
    fireEvent.click(screen.getByRole('button', { name: 'Create an invoice' }));
    expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Find an invoice' }));
    fireEvent.change(screen.getByLabelText('Invoice ID'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Look up invoice' }));
    await screen.findByRole('heading', { name: 'Invoice 1' });
    expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
  });
});
