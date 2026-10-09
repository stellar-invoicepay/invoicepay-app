# InvoicePay app

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/brand/logo-dark.svg">
  <img src="public/brand/logo.svg" alt="InvoicePay" height="72">
</picture>

A Vite, React and TypeScript workspace for opaque invoices on Stellar testnet.
Implemented flows: create, invoice/receipt lookup, partial payment, cancellation
before any payment, and freelancer refunds. The app uses the sibling contract's
actual six-method ABI. Tokens move directly between payer and freelancer.

**TESTNET - no real money. No real business pilot has happened.** A synthetic
contract demonstration deployment exists; the browser-to-wallet payment flow
still needs a manual test. Deployment does not establish adoption, security for
real funds or completed browser transactions.

## Run locally

Use Node 24. Run `npm ci`, copy [.env.example](.env.example) to a local `.env`,
and fill in the public contract ID from the [deployment record](docs/testnet-deployment.md).
Keep the network as `testnet`. Never put a private key or seed phrase in Vite
environment variables. Run `npm run dev` and connect a funded testnet wallet.
Missing or non-testnet configuration disables the workspace.

```sh
npm ci
npm run dev
```

Amounts are whole numbers in the token's **smallest units**. The app does not
fetch decimals, create trustlines or check balances. Verify these separately.
For a seven-decimal token, `10000000` raw units equals one token. Enter a testnet
SEP-41 token contract, not an asset ticker.

Keep documents off-chain. Enter only a 64-character hexadecimal opaque hash;
never names, invoice numbers, email addresses, phone numbers or personal IDs.
A public hash does not anonymize predictable content.

## Verify locally

```sh
npm run lint
npm run typecheck
npm test -- --maxWorkers=1
npm run build
```

Tests cover validation limits, error wording, decoded invoice state, testnet and
session guards, pending-action lifecycle, lookup behavior and accessible labels.
Wallet and RPC tests are mocked. DOM axe checks exclude rendered color contrast.
The [CI workflow](.github/workflows/web.yml) runs these commands; configuring it
does not establish that remote CI has passed.

Local verification on October 8, 2026: lint, type checking, **53 tests in eight
files**, and production build passed. Tests use one threads worker. The main
JavaScript chunk remains 793.23 kB (187.00 kB gzip), so Vite reports its 500 kB
chunk warning. Manual wallet and real-user testing remain separate.
`npm audit` reports 19 dependency advisories: 13 low and six moderate, with no
high or critical advisories. They remain unresolved; no forced dependency
upgrade was applied.

## Source and limitations

- [Workspace UI](src/pages/Workspace.tsx) exposes implemented contract actions.
- [Contract client](src/lib/contract.ts) simulates and assembles reads and writes,
  returning confirmed transaction hashes with explorer links.
- [Write flow](src/lib/flow.ts) checks testnet twice and rejects abandoned sessions
  before signing or submission. Disconnecting cannot cancel submitted transactions.
- [Error mapping](src/lib/contractErrors.ts) matches the [vendored table](docs/contract-errors.md).
- No backend, analytics, invoice PDF, notifications, platform fees, invoice
  discovery, pagination, archived-record restoration or mainnet support.
- Addresses, amounts, due dates, hashes and receipts remain public.
- Testnet resets can remove contracts and transaction history.

See [ROADMAP.md](ROADMAP.md), [AGENTS.md](AGENTS.md) and the sibling
`invoicepay-docs` book. Automated tests do not replace manual wallet, device,
screen-reader and demonstration testing.
