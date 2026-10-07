/**
 * Contract error code -> plain-language message.
 *
 * Every string below is copied **verbatim** from the "user-facing message" and
 * "next action" columns of `ERRORS.md` in `invoicepay-contracts`. That file is
 * the single source of truth: `AGENTS.md` forbids inventing different wording,
 * and `src/lib/contractErrors.test.ts` fails if a variant in the vendored copy
 * of that table (`docs/contract-errors.md`) has no message here.
 *
 * Do not reword these by hand. If `ERRORS.md` changes, re-copy it and update
 * this table in the same commit.
 */

export interface ContractErrorInfo {
  readonly variant: string;
  readonly message: string;
  readonly nextAction: string;
}

export const CONTRACT_ERRORS: Readonly<Partial<Record<number, ContractErrorInfo>>> = {
  1: {
    variant: "InvoiceNotFound",
    message: "We couldn't find that invoice. Check the invoice id with the freelancer.",
    nextAction: "Confirm the invoice id with the freelancer.",
  },
  2: {
    variant: "PaymentNotFound",
    message: "That address has not paid anything on this invoice.",
    nextAction: "Check the payer address and the invoice.",
  },
  10: {
    variant: "InvoiceCancelled",
    message: "This invoice has been cancelled and no longer accepts payments.",
    nextAction: "Ask the freelancer for a replacement invoice.",
  },
  11: {
    variant: "InvoiceExpired",
    message: "The due date for this invoice has passed.",
    nextAction: "Ask the freelancer whether a new invoice is coming; refunds still work.",
  },
  12: {
    variant: "Overpayment",
    message: "That payment is more than the invoice still owes.",
    nextAction: "Pay the remaining amount or less; partial payments are allowed.",
  },
  13: {
    variant: "ClientMismatch",
    message: "This invoice can only be paid by the client it was issued to.",
    nextAction: "Have the named client pay, or ask the freelancer to lift the restriction.",
  },
  14: {
    variant: "CancelNotAllowed",
    message: "This invoice has payments on it and cannot be cancelled.",
    nextAction: "Use `refund` to return funds instead.",
  },
  15: {
    variant: "RefundTooLarge",
    message: "That refund is more than this payer's remaining paid balance.",
    nextAction: "Refund an amount up to the payer's net paid total.",
  },
  16: {
    variant: "PayersTooMany",
    message: "This invoice cannot take payments from any more distinct payers.",
    nextAction: "Ask the freelancer to issue a new invoice.",
  },
  30: {
    variant: "InvalidAmount",
    message: "Amounts must be greater than zero.",
    nextAction: "Enter a positive amount.",
  },
  31: {
    variant: "DueAtInPast",
    message: "The due date must be in the future.",
    nextAction: "Choose a new due date and recreate the invoice.",
  },
};

/**
 * Shown when a failure has no message at all to pass on. It is deliberately
 * generic: it is not a message from `ERRORS.md` and must not pretend to be one.
 */
export const GENERIC_ERROR_MESSAGE =
  'Something went wrong. Please check your connection and try again.';

/**
 * Thrown when the wallet is not on testnet. The app refuses to operate, so the
 * message must say what to do rather than blaming the user's connection.
 */
export const WRONG_NETWORK_MESSAGE =
  'Your wallet is set to a different network. Switch it to testnet and try again.';

export interface MappedError {
  readonly message: string;
  readonly nextAction?: string;
  readonly code?: number;
}

/** Pulls the message text out of whatever was thrown. */
function messageOf(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error !== null && typeof error === 'object' && 'message' in error) {
    const value: unknown = (error as { message: unknown }).message;
    if (typeof value === 'string') return value;
  }
  return '';
}

/**
 * Finds a Soroban contract error code in a host error string.
 *
 * Stellar RPC reports these as, for example,
 * `HostError: Error(Contract, #3)`. The code is the number after `#`.
 */
export function parseContractErrorCode(text: string): number | null {
  const match = /Error\(Contract,\s*#(\d+)\)/.exec(text) ?? /Contract,\s*#(\d+)/.exec(text);
  if (match === null) return null;
  return Number(match[1]);
}

/**
 * Turns any thrown value into a message the user can act on.
 *
 * Order of preference:
 * 1. a contract error code with reviewed wording in `ERRORS.md`;
 * 2. a contract error code without reviewed wording — a generic message that
 *    names the code, so it can be reported and added to `ERRORS.md`;
 * 3. the error's own message, for things that are not contract errors at all
 *    (a rejected wallet prompt, an RPC outage, a wrong-network refusal);
 * 4. a generic message when there is nothing at all to pass on.
 */
export function describeContractError(error: unknown): MappedError {
  const text = messageOf(error);
  const code = parseContractErrorCode(text);

  if (code !== null) {
    const known = CONTRACT_ERRORS[code];
    if (known !== undefined) {
      return { message: known.message, nextAction: known.nextAction, code };
    }

    // TODO(verify): this code is not in ERRORS.md in invoicepay-contracts, so
    // there is no reviewed wording for it. Name the code so it can be added.
    return {
      message: `Something went wrong (contract error code ${code}). Please report this.`,
      code,
    };
  }

  if (text !== '') {
    return { message: text };
  }
  return { message: GENERIC_ERROR_MESSAGE };
}


export interface ErrorTableRow {
  readonly code: number;
  readonly variant: string;
  readonly message: string;
  readonly nextAction: string;
}

function stripQuotes(value: string): string {
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Parses the error rows out of an `ERRORS.md`-shaped markdown table. Used by the
 * test that keeps this module in sync with the contract's error table.
 */
export function parseErrorTable(markdown: string): ErrorTableRow[] {
  const rows: ErrorTableRow[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trimStart().startsWith('|')) continue;

    const cells = line.split('|');
    // | code | variant | raised by | trigger | message | next action |
    if (cells.length !== 8) continue;

    const code = cells[1].trim();
    if (!/^\d+$/.test(code)) continue;

    rows.push({
      code: Number(code),
      variant: cells[2].trim().replace(/`/g, ''),
      message: stripQuotes(cells[5].trim()),
      nextAction: cells[6].trim(),
    });
  }

  return rows;
}
