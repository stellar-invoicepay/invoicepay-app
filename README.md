# InvoicePay app - incomplete

This repository contains an unfinished Vite, React and TypeScript scaffold for
freelancer invoices on Stellar testnet. It is **not a runnable application or a
submission candidate**. Full app implementation is deferred until after the
October 9 submission work on the implemented projects.

The sibling `invoicepay-contracts` repository has an implemented Rust contract;
that does not imply this app is usable. `invoicepay-docs` remains a documentation
scaffold. No pilot has happened, and this app has never used a deployed contract
or real wallet. Testnet only; never use real funds.

## Existing files

The scaffold includes configuration, validation and error helpers, wallet module
configuration with local icons, shared components and a pending-action hook.
The package and lockfile identify `invoicepay-app`. The error mapping and
[vendored table](docs/contract-errors.md) use the sibling contract's `ERRORS.md`.
These files are starting points, not a complete product.

## Missing before the app can run

- HTML entry, React entry and application root, routing and styles.
- InvoicePay contract ABI and RPC integration.
- Freelancer and client invoice pages, payment, cancellation and receipt flows.
- Unit and accessible render tests, test setup and CI.
- Environment example and reproducible setup instructions.

The package scripts describe intended checks. No successful app build, test run,
deployment or wallet transaction is claimed. See [ROADMAP.md](ROADMAP.md) for
remaining scope and [AGENTS.md](AGENTS.md) for privacy and signing rules.
