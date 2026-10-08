import { Address, nativeToScVal, xdr } from '@stellar/stellar-sdk';

import { REFERENCE_BYTES } from './reference';

/**
 * Converts between JavaScript values and the `xdr.ScVal` values the contract's
 * ABI uses. The conversions match `src/lib.rs` in `invoicepay-contracts`:
 * `Address`, `BytesN<32>`, `i128` and `u64`.
 */

export function addressToScVal(address: string): xdr.ScVal {
  return Address.fromString(address).toScVal();
}

export function i128ToScVal(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: 'i128' });
}

export function u64ToScVal(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: 'u64' });
}

/** `BytesN<32>` — the contract's opaque reference. */
export function referenceToScVal(bytes: Uint8Array): xdr.ScVal {
  if (bytes.length !== REFERENCE_BYTES) {
    throw new Error(
      `a contract reference is exactly ${REFERENCE_BYTES} bytes, got ${bytes.length}`,
    );
  }
  return nativeToScVal(bytes, { type: 'bytes' });
}
