import { useEffect, useMemo, useRef, useState } from 'react';
import { configResult } from './config';
import { TestnetBanner } from './components/TestnetBanner';
import { WalletBar } from './components/WalletBar';
import { useWallet } from './hooks/useWallet';
import { createContractClient } from './lib/contract';
import type { AppConfig } from './lib/network';
import { Workspace } from './pages/Workspace';
import { Landing } from './pages/Landing';

function ConfiguredApp({ config }: { config: AppConfig }) {
  const wallet = useWallet();
  const client = useMemo(() => createContractClient(config), [config]);
  return <><section className="wallet-stage" aria-labelledby="wallet-stage-title"><div className="wallet-stage-copy"><span className="stage-number" aria-hidden="true">1</span><div><h2 id="wallet-stage-title">Connect your testnet wallet</h2><p>Use your public address to read records. Your wallet signs when you choose to send a transaction.</p></div></div><div className="wallet-stage-controls"><p className="connection-status">{wallet.address ? wallet.onTestnet === true ? 'Connected to testnet' : 'Check your wallet network' : 'Not connected'}</p><WalletBar wallet={wallet} /></div></section><Workspace key={wallet.address ?? 'disconnected'} wallet={wallet} client={client} config={config} /></>;
}
export function App() {
  const [screen, setScreen] = useState<'landing' | 'workspace'>('landing');
  const [workspaceOpened, setWorkspaceOpened] = useState(false);
  function openWorkspace() { setWorkspaceOpened(true); setScreen('workspace'); }
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    mainRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen]);
  return <><a className="skip-link" href="#main">Skip to content</a><TestnetBanner /><div className="shell">
    <header className="masthead"><a className="wordmark brand-identity" href="#main" onClick={() => setScreen('landing')} aria-label="InvoicePay home"><img className="brand-mark" src="/brand/mark.svg" width="36" height="36" alt="" aria-hidden="true" />InvoicePay</a><nav className="site-nav" aria-label="Site navigation">{screen === 'landing' ? <><a href="#how-it-works">How it works</a><button className="secondary" type="button" onClick={openWorkspace}>Open invoice workspace</button></> : <button className="secondary" type="button" onClick={() => setScreen('landing')}>Back to overview</button>}</nav></header>
    <main id="main" ref={mainRef} tabIndex={-1}>{screen === 'landing' && <Landing onOpen={openWorkspace} />}<div hidden={screen !== 'workspace'}><div className="workspace-intro"><p className="section-label">Your testnet workspace</p><h1>One invoice.<br />A clear payment record.</h1><p className="intro">Create a reference, pay in parts, or inspect a receipt. Your wallet authorizes each transaction.</p></div>{configResult.ok ? workspaceOpened && <ConfiguredApp config={configResult.config} /> : <section className="notice" aria-labelledby="setup-title"><h2 id="setup-title">Configure your testnet workspace</h2><p>Set the public values in .env using .env.example, then restart the app. Never put a secret key in this file.</p><ul>{configResult.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul></section>}</div></main>
    <footer className="site-footer"><a className="footer-name" href="#main" onClick={() => setScreen('landing')}>InvoicePay</a><p>Stellar testnet only. Synthetic contract demonstration exists; signed browser payment flows remain unverified. No real-business pilot is claimed.</p><a href="https://github.com/stellar-invoicepay/invoicepay-docs" target="_blank" rel="noreferrer">Documentation</a></footer>
  </div></>;
}
