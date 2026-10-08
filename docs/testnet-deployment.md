# Testnet demonstration deployment

The project owner authorized synthetic-data testnet demonstrations on October 8,
2026. This is separate from a real freelancer/client pilot; none has happened.

- Contract: `CCJ652VR7Y7H5KE5FUDT4FSTTN3FJECY44RJYHBW4J2BPSXVETJLTJKU`
- Deployment transaction: `ab1b0d5718a824d718996c6d9497ac56d93770897769ff19435af37b3618eb2e`
- Wasm SHA-256: `df77525063bda9e74fd183547895be59a3c7efd50b039cc8241d4313b316f709`

The deployment task verified the transaction as `SUCCESS` through Stellar RPC
and matched the on-chain executable's Wasm hash to the local build. These are
public demonstration identifiers, not a pilot. No application payment,
cancellation or refund outcome is claimed here.

## Inspect the deployment

1. Open [the contract on Stellar Expert testnet](https://stellar.expert/explorer/testnet/contract/CCJ652VR7Y7H5KE5FUDT4FSTTN3FJECY44RJYHBW4J2BPSXVETJLTJKU).
2. Confirm the explorer says **testnet** and compare the full contract address.
3. Open [the deployment transaction](https://stellar.expert/explorer/testnet/tx/ab1b0d5718a824d718996c6d9497ac56d93770897769ff19435af37b3618eb2e).
4. Check successful transaction status and the contract-creation operation. A
   deployment alone creates no invoices and proves no payment flow.
5. To run the app, copy this public contract ID to `VITE_CONTRACT_ID` in your
   local `.env`, keeping the other values from `.env.example`. Restart Vite.
6. After an app action, follow its transaction link and compare the full hash,
   status, affected contract and events. Keep testnet selected. Never interpret
   a queued wallet request or simulation as a completed on-chain action.

Testnet resets can remove contracts and transactions. Recheck availability before
demonstrating; no private account key belongs in documentation or Vite config.
