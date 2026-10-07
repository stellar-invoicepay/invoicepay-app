# InvoicePay app roadmap

Status on October 7, 2026: partial scaffold, not runnable. Full app work is
deferred beyond this submission window; the contract is assessed independently.

## Present

- Repository governance and package configuration.
- Shared helper, wallet configuration and component source as starting points.
- Package identity and canonical InvoicePay contract error messages.

Presence of source does not establish correctness: the app has no completed test
suite, build or deployed-wallet verification.

## Required for v0

- [ ] HTML and React entries, app root, styles and routing.
- [ ] InvoicePay ABI and invocation integration using environment configuration.
- [ ] Freelancer creates invoices, views status and payments, and cancels.
- [ ] Client opens invoices by id, makes full or partial payment and views receipts.
- [ ] Visible TESTNET banner, wrong-network refusal, hashes and explorer links.
- [ ] No personal data in chain payloads; wallets sign without exposing keys.
- [ ] Environment example, setup instructions, unit and accessible render tests, CI.
- [ ] Validate lint, type checking, tests and production build before claiming readiness.

Scope follows `_reference/playbooks/STELLAR-BUILD-PLAYBOOK-v3.md`, section 6,
with v4 and SchoolFees as implementation standards. Mainnet, backend, database,
analytics, trackers, CSV export, share links and emails are outside v0.

## Human decisions

Confirm a real pilot partner and testnet deployment plan before deployment.
No partner, pilot, live transaction or outcome is claimed.
