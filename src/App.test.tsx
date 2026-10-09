// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const mocks = vi.hoisted(() => ({ initialize: vi.fn(), connect: vi.fn(), getInvoice: vi.fn(), getReceipt: vi.fn() }));
vi.mock('./config', () => ({ configResult: { ok: true, config: { network: 'testnet', passphrase: 'Test SDF Network ; September 2015', rpcUrl: 'https://rpc.example', contractId: 'fixture', explorerBaseUrl: 'https://stellar.expert/explorer/testnet' } } }));
vi.mock('./hooks/useWallet', () => ({ useWallet: () => { mocks.initialize(); return { address: null, connecting: false, error: null, onTestnet: null, connect: mocks.connect, disconnect: vi.fn(), refreshNetwork: vi.fn() }; } }));
vi.mock('./lib/contract', () => ({ createContractClient: () => ({ getInvoice: mocks.getInvoice, getReceipt: mocks.getReceipt }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('landing and invoice workspace navigation', () => {
  it('opens with an overview without requesting a wallet or invoice read', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Good work. Clear payments.' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Connect wallet' })).toBeNull();
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(mocks.initialize).not.toHaveBeenCalled();
    expect(mocks.getInvoice).not.toHaveBeenCalled();
    expect(mocks.getReceipt).not.toHaveBeenCalled();
  });
  it('opens the workspace with keyboard activation and moves focus to main', async () => {
    const user = userEvent.setup(); render(<App />);
    const button = screen.getAllByRole('button', { name: 'Open invoice workspace' })[0]!;
    button.focus(); await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Connect wallet' })).toBeTruthy();
    expect(document.activeElement).toBe(document.querySelector('main'));
    expect(screen.getByText('TESTNET - no real money')).toBeTruthy();
  });
  it('preserves the task and unsent input while returning to the overview', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getAllByRole('button', { name: 'Open invoice workspace' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Create an invoice' }));
    fireEvent.change(screen.getByLabelText('Opaque document hash'), { target: { value: 'a'.repeat(64) } });
    await user.click(screen.getByRole('button', { name: 'Back to overview' }));
    expect(screen.getByRole('heading', { name: 'Good work. Clear payments.' })).toBeTruthy();
    await user.click(screen.getAllByRole('button', { name: 'Open invoice workspace' })[0]!);
    expect((screen.getByLabelText('Opaque document hash') as HTMLInputElement).value).toBe('a'.repeat(64));
    expect(mocks.connect).not.toHaveBeenCalled();
  });
});
