import { useMemo } from 'react';
import { configResult } from './config';
import { TestnetBanner } from './components/TestnetBanner';
import { WalletBar } from './components/WalletBar';
import { useWallet } from './hooks/useWallet';
import { createContractClient } from './lib/contract';
import type { AppConfig } from './lib/network';
import { Workspace } from './pages/Workspace';

function ConfiguredApp({ config }: { config: AppConfig }) {
  const wallet = useWallet();
  const client = useMemo(() => createContractClient(config), [config]);
  return <><WalletBar wallet={wallet} /><Workspace key={wallet.address ?? 'disconnected'} wallet={wallet} client={client} config={config} /></>;
}
export function App() {
  return <><a className="skip-link" href="#main">Skip to invoice workspace</a><TestnetBanner /><div className="shell"><header className="masthead"><a className="wordmark brand-identity" href="#main"><img className="brand-mark" src="/brand/mark.svg" width="36" height="36" alt="" aria-hidden="true" />InvoicePay</a><p>Keep the work private. Make the payment verifiable.</p></header><main id="main"><h1>Your invoice, with a public payment record.</h1><p className="intro">Create an opaque invoice reference, pay in parts, and inspect the receipt. Tokens move directly between payer and freelancer.</p>{configResult.ok ? <ConfiguredApp config={configResult.config} /> : <section className="notice" aria-labelledby="setup-title"><h2 id="setup-title">Configure your testnet workspace</h2><p>Set the public values in .env using .env.example, then restart the app. Never put a secret key in this file.</p><ul>{configResult.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul></section>}</main><footer>Testnet demonstration. No real business pilot has happened. No backend, analytics or private invoice documents are stored here.</footer></div></>;
}
