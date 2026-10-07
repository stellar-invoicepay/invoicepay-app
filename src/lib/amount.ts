export type AmountResult =
  | { readonly ok: true; readonly value: bigint }
  | { readonly ok: false; readonly message: string };

/**
 * Parses a fee amount.
 *
 * The contract stores amounts as raw `i128` integers and the app does not fetch
 * a token's decimals in v0, so an amount here is a whole number of the token's
 * smallest unit. That is stated in the UI rather than guessed at — see
 * `descriptions.amountUnit` in the pages.
 */
export function parsePositiveAmount(input: string): AmountResult {
  const trimmed = input.trim();

  if (trimmed === '') {
    return { ok: false, message: 'Enter an amount greater than zero.' };
  }

  if (/^[+-]?\d+$/.test(trimmed)) {
    const value = BigInt(trimmed);
    if (value <= 0n) {
      // Same wording as the contract's InvalidAmount message in ERRORS.md.
      return { ok: false, message: 'Enter an amount greater than zero.' };
    }
    return { ok: true, value };
  }

  return {
    ok: false,
    message:
      'Enter a whole number, using digits only — the app does not convert decimal places in v0.',
  };
}

/** Formats a whole amount with thousands separators: `1234567` -> `1,234,567`. */
export function formatAmount(value: bigint): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return negative ? `-${grouped}` : grouped;
}
