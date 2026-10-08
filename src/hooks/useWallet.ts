import { useCallback, useEffect, useRef, useState } from 'react';
import { checkWalletNetwork, connectWallet, disconnectWallet, rememberedAddress } from '../lib/wallet';
import { describeContractError } from '../lib/contractErrors';

export interface WalletController {
  readonly address: string | null;
  readonly connecting: boolean;
  readonly error: string | null;
  readonly onTestnet: boolean | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshNetwork: () => Promise<boolean>;
}

/** Only public addresses are retained. Abandoned requests cannot restore a session. */
export function useWallet(): WalletController {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onTestnet, setOnTestnet] = useState<boolean | null>(null);
  const mounted = useRef(true);
  const generation = useRef(0);
  const networkRequest = useRef(0);
  const connectingRef = useRef(false);
  const disconnecting = useRef(false);

  const refreshNetwork = useCallback(async (): Promise<boolean> => {
    const session = generation.current;
    const request = ++networkRequest.current;
    let valid = false;
    try { valid = (await checkWalletNetwork()).onTestnet; } catch { /* fail closed */ }
    if (!mounted.current || session !== generation.current || request !== networkRequest.current) return false;
    setOnTestnet(valid);
    return valid;
  }, []);

  useEffect(() => {
    mounted.current = true;
    const session = ++generation.current;
    void (async () => {
      try {
        const existing = await rememberedAddress();
        if (!mounted.current || session !== generation.current || existing === null) return;
        setAddress(existing);
        await refreshNetwork();
      } catch {
        if (mounted.current && session === generation.current) setOnTestnet(false);
      }
    })();
    return () => { mounted.current = false; generation.current += 1; };
  }, [refreshNetwork]);

  const connect = useCallback(async () => {
    if (!mounted.current || connectingRef.current || disconnecting.current) return;
    connectingRef.current = true;
    const session = ++generation.current;
    setConnecting(true);
    setError(null);
    setOnTestnet(null);
    try {
      const connected = await connectWallet();
      if (!mounted.current || session !== generation.current) return;
      setAddress(connected);
      await refreshNetwork();
    } catch (thrown) {
      if (mounted.current && session === generation.current) {
        setError(describeContractError(thrown).message);
      }
    } finally {
      connectingRef.current = false;
      if (mounted.current) setConnecting(false);
    }
  }, [refreshNetwork]);

  const disconnect = useCallback(async () => {
    if (!mounted.current || disconnecting.current) return;
    disconnecting.current = true;
    generation.current += 1;
    setError(null);
    setAddress(null);
    setOnTestnet(null);
    setConnecting(false);
    try { await disconnectWallet(); } catch { /* local state stays disconnected */ }
    finally { disconnecting.current = false; }
  }, []);

  return { address, connecting, error, onTestnet, connect, disconnect, refreshNetwork };
}
