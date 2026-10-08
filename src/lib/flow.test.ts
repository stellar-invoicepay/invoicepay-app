import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runWrite } from './flow';
import type { ContractClient } from './contract';
import { TESTNET_PASSPHRASE } from './network';
import { checkWalletNetwork, signWithWallet } from './wallet';
vi.mock('./wallet', () => ({ checkWalletNetwork: vi.fn(), signWithWallet: vi.fn() }));
describe('wallet write flow', () => {
  const prepare = vi.fn(async () => ({ xdr: 'unsigned' }));
  const submit = vi.fn(async () => ({ hash: 'a'.repeat(64) }));
  const client = { submit } as unknown as ContractClient;
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(checkWalletNetwork).mockResolvedValue({ onTestnet: true, passphrase: TESTNET_PASSPHRASE }); vi.mocked(signWithWallet).mockResolvedValue('signed'); });
  it('checks testnet before preparing and again before signing', async () => {
    await runWrite(client, 'account', TESTNET_PASSPHRASE, prepare);
    expect(checkWalletNetwork).toHaveBeenCalledTimes(2);
    expect(signWithWallet).toHaveBeenCalledWith('unsigned', 'account', TESTNET_PASSPHRASE);
    expect(submit).toHaveBeenCalledWith('signed');
  });
  it('refuses mainnet before transaction preparation', async () => {
    vi.mocked(checkWalletNetwork).mockResolvedValue({ onTestnet: false, passphrase: 'mainnet' });
    await expect(runWrite(client, 'account', TESTNET_PASSPHRASE, prepare)).rejects.toThrow('different network');
    expect(prepare).not.toHaveBeenCalled(); expect(submit).not.toHaveBeenCalled();
  });
  it('refuses a network switch during simulation', async () => {
    vi.mocked(checkWalletNetwork).mockResolvedValueOnce({ onTestnet: true, passphrase: TESTNET_PASSPHRASE }).mockResolvedValueOnce({ onTestnet: false, passphrase: 'mainnet' });
    await expect(runWrite(client, 'account', TESTNET_PASSPHRASE, prepare)).rejects.toThrow();
    expect(signWithWallet).not.toHaveBeenCalled();
  });
  it('does not sign when a wallet session changes during preparation', async () => {
    let current = true;
    const delayed = async () => { current = false; return { xdr: 'unsigned' }; };
    await expect(runWrite(client, 'account', TESTNET_PASSPHRASE, delayed, () => { if (!current) throw new Error('session changed'); })).rejects.toThrow('session changed');
    expect(signWithWallet).not.toHaveBeenCalled(); expect(submit).not.toHaveBeenCalled();
  });
  it('does not submit a late signature after disconnect', async () => {
    let current = true;
    vi.mocked(signWithWallet).mockImplementation(async () => { current = false; return 'signed'; });
    await expect(runWrite(client, 'account', TESTNET_PASSPHRASE, prepare, () => { if (!current) throw new Error('session changed'); })).rejects.toThrow();
    expect(submit).not.toHaveBeenCalled();
  });
});
