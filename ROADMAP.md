# InvoicePay app roadmap

Status on October 8, 2026: v0 browser workspace implemented. Synthetic contract
deployment exists; no real pilot or completed browser wallet flow is claimed.

## Present

- Repository governance and package configuration.
- Wallet configuration, guarded actions, forms and accessible labelled controls.
- Package identity and canonical InvoicePay contract error messages.

Presence of source does not establish a deployed-wallet demonstration. Automated
checks and manual transaction verification are separate evidence.

## Required for v0

- [x] HTML and React entries, app root, styles and task navigation.
- [x] InvoicePay ABI and invocation integration using environment configuration.
- [x] Freelancer creates invoices, views status/payments, cancels and refunds.
- [x] Client opens invoices by id, makes full or partial payment and views receipts.
- [x] Visible TESTNET banner, wrong-network refusal, hashes and explorer links.
- [x] Opaque reference validation; wallet signatures without exposing keys.
- [x] Environment example, setup instructions, unit and accessible render tests, CI.
- [x] Local lint, type checking, 53 tests across eight files and production build
      passed on October 8, 2026. Remote CI remains pending publication.
- [ ] Manual browser wallet flow on the deployed contract using synthetic data.
- [ ] Real freelancer/client partner and pilot feedback.

Scope follows `_reference/playbooks/STELLAR-BUILD-PLAYBOOK-v3.md`, section 6,
with v4 and SchoolFees as implementation standards. Mainnet, backend, database,
analytics, trackers, CSV export, share links and emails are outside v0.

## Human decisions

The owner authorized synthetic-data testnet demonstration deployments on October
8, 2026. This does not satisfy the separate real pilot-partner gate. A freelancer
and client must agree before any real-business pilot. No partner, pilot or browser
payment outcome is claimed. [Public deployment record](docs/testnet-deployment.md).
