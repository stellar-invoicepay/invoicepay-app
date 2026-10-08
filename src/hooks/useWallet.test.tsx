// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWallet } from './useWallet';
import { checkWalletNetwork, connectWallet, disconnectWallet, rememberedAddress } from '../lib/wallet';
import { TESTNET_PASSPHRASE } from '../lib/network';
vi.mock('../lib/wallet', () => ({ checkWalletNetwork: vi.fn(), connectWallet: vi.fn(), disconnectWallet: vi.fn(), rememberedAddress: vi.fn() }));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => { vi.clearAllMocks(); vi.mocked(rememberedAddress).mockResolvedValue(null); vi.mocked(checkWalletNetwork).mockResolvedValue({ onTestnet: true, passphrase: TESTNET_PASSPHRASE }); vi.mocked(disconnectWallet).mockResolvedValue(); });
describe('wallet lifecycle', () => {
  it('ignores a late connection after disconnect', async () => {
    const pending = deferred<string>();
    vi.mocked(connectWallet).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useWallet());
    let connecting!: Promise<void>;
    act(() => { connecting = result.current.connect(); });
    await act(async () => { await result.current.disconnect(); });
    await act(async () => { pending.resolve('late-account'); await connecting; });
    expect(result.current.address).toBeNull(); expect(result.current.onTestnet).toBeNull();
  });
  it('ignores a remembered address after the wallet session changes', async () => {
    const pending = deferred<string | null>();
    vi.mocked(rememberedAddress).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useWallet());
    await act(async () => { await result.current.disconnect(); });
    await act(async () => { pending.resolve('old-account'); });
    expect(result.current.address).toBeNull();
  });
  it('retains no trusted-network state when network reporting fails', async () => {
    vi.mocked(connectWallet).mockResolvedValue('public-account');
    vi.mocked(checkWalletNetwork).mockRejectedValue(new Error('provider offline'));
    const { result } = renderHook(() => useWallet());
    await act(async () => { await result.current.connect(); });
    await waitFor(() => expect(result.current.onTestnet).toBe(false));
    expect(result.current.connecting).toBe(false);
  });
  it('does not start duplicate connection prompts', async () => {
    const pending = deferred<string>();
    vi.mocked(connectWallet).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useWallet());
    let first!: Promise<void>;
    act(() => { first = result.current.connect(); });
    await result.current.connect();
    expect(connectWallet).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve('public-account'); await first; });
  });
});
