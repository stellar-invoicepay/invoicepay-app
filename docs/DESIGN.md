# InvoicePay presentation

The overview is the default screen. “Open invoice workspace” reveals the wallet
stage and existing invoice tasks. The overview return control retains the mounted
workspace so unsent input, wallet session and receipts survive navigation. Screen
changes focus the main landmark; neither navigation nor the overview requests a
wallet signature or performs an invoice read.

The design retains the canonical teal brand (#0F766E), uses locally available
system fonts and a paper/sage palette, and provides a generous typographic scale
with responsive gutters. The decorative wood/foliage/document still life is an
original local SVG, not a third-party image or a transaction screenshot. It has an
empty alternative text and conveys no payment evidence.

Buttons have at least48px height and navigation links at least44px, with visible
focus outlines and specific180ms eased
color transitions. Reduced-motion preference disables nonessential transitions.
Forms retain the existing smallest-unit, opaque-hash, network and wallet guards;
canonical contract error wording is unchanged. The testnet notice remains visible
on both screens. The landing page states that addresses, amounts and hashes are
public, browser-wallet payment flows remain unverified and no pilot is claimed.

Automated navigation tests supplement the existing mocked contract/wallet tests.
Rendered browser contrast and layout checks are separate from DOM tests. Neither
these checks nor an aesthetic redesign establishes a signed browser payment flow,
real-world adoption or suitability for real funds.
