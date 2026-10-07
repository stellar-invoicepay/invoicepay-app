/** The contract stores a `BytesN<32>` reference. */
export const REFERENCE_BYTES = 32;

/** That is 64 hexadecimal characters. */
export const REFERENCE_HEX_LENGTH = REFERENCE_BYTES * 2;

/**
 * The plain-language rule shown next to the field. It matters more than the
 * validation itself: the contract cannot check what goes into these 32 bytes,
 * so a mistake here is permanent and public.
 */
export const REFERENCE_WARNING =
  'Never enter a name, phone number, email address, student or member id, or ' +
  'anything else about a person. Use an opaque value — for example a hash your ' +
  'school computed from its own internal record — so the reference means ' +
  'nothing to anyone reading the public ledger.';

export const REFERENCE_HINT = `Exactly ${REFERENCE_HEX_LENGTH} hexadecimal characters (32 bytes).`;

export type ReferenceResult =
  | { readonly ok: true; readonly bytes: Uint8Array; readonly hex: string }
  | { readonly ok: false; readonly message: string };

/**
 * Accepts only the form the contract actually takes: 32 bytes, written as 64
 * hexadecimal characters. Everything else is rejected, including anything that
 * looks like a free-text identifier.
 */
export function validateReference(input: string): ReferenceResult {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === '') {
    return { ok: false, message: 'Enter an opaque reference.' };
  }
  if (trimmed.length !== REFERENCE_HEX_LENGTH) {
    return {
      ok: false,
      message:
        `A reference must be exactly ${REFERENCE_HEX_LENGTH} hexadecimal characters ` +
        `(${REFERENCE_BYTES} bytes). You entered ${trimmed.length} characters.`,
    };
  }
  if (!/^[0-9a-f]+$/.test(trimmed)) {
    return {
      ok: false,
      message:
        'A reference must be hexadecimal only (the characters 0-9 and a-f), because ' +
        'the contract stores it as 32 raw bytes. Names, phone numbers and ids are ' +
        'not valid references.',
    };
  }

  const bytes = new Uint8Array(REFERENCE_BYTES);
  for (let index = 0; index < REFERENCE_BYTES; index += 1) {
    bytes[index] = Number.parseInt(trimmed.slice(index * 2, index * 2 + 2), 16);
  }
  return { ok: true, bytes, hex: trimmed };
}

/** Shortens a reference for display: `0x1234abcd…`. */
export function formatReference(hex: string, edge = 8): string {
  if (hex.length <= edge * 2) return `0x${hex}`;
  return `0x${hex.slice(0, edge)}…${hex.slice(-edge)}`;
}

/** Renders stored reference bytes as the hex form a school would have entered. */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
