import { StrKey } from '@stellar/stellar-sdk';

export type AddressCheck =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly message: string };

/** A wallet/account address (a public key starting with `G`). */
export function validateAccountAddress(input: string): AddressCheck {
  const trimmed = input.trim();
  if (trimmed === '') {
    return { ok: false, message: 'Enter a Stellar account address.' };
  }
  if (!StrKey.isValidEd25519PublicKey(trimmed)) {
    return {
      ok: false,
      message: 'That is not a Stellar account address. Account addresses start with G.',
    };
  }
  return { ok: true, value: trimmed };
}

/** A contract address, used for the SEP-41 token the fee is denominated in. */
export function validateContractAddress(input: string): AddressCheck {
  const trimmed = input.trim();
  if (trimmed === '') {
    return { ok: false, message: 'Enter the token contract address.' };
  }
  if (!StrKey.isValidContract(trimmed)) {
    return {
      ok: false,
      message: 'That is not a contract address. Token contract addresses start with C.',
    };
  }
  return { ok: true, value: trimmed };
}

export type InvoiceIdCheck =
  | { readonly ok: true; readonly value: bigint }
  | { readonly ok: false; readonly message: string };

/** Invoice ids start at 1 on-chain (`src/invoices.rs::create_invoice`). */
export function validateInvoiceId(input: string): InvoiceIdCheck {
  const trimmed = input.trim();
  if (trimmed === '') {
    return { ok: false, message: 'Enter an invoice id.' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, message: 'An invoice id is a whole number.' };
  }
  const value = BigInt(trimmed);
  if (value < 1n) {
    return { ok: false, message: 'Invoice ids start at 1.' };
  }
  if (value > (1n << 64n) - 1n) return { ok: false, message: 'The invoice ID exceeds the contract’s supported range.' };
  return { ok: true, value };
}
