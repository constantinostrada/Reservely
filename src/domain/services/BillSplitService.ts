export const MAX_SPLIT_WAYS = 50;

/**
 * Splits integer-cent amounts among diners.
 *
 * The split is exact and deterministic: every share is `floor(total / ways)`
 * cents, and the remainder (`total % ways`, always fewer cents than there
 * are shares) is distributed one cent at a time to the first shares. The
 * shares therefore always sum back to the exact total — no cent is ever
 * lost or invented — and the same input always yields the same shares, in
 * descending order (earlier diners pay the extra cent).
 */
export class BillSplitService {
  public split(totalCents: number, ways: number): number[] {
    if (!Number.isInteger(totalCents) || totalCents < 0) {
      throw new Error('Total must be a non-negative integer amount in cents');
    }

    if (!Number.isInteger(ways) || ways < 1) {
      throw new Error('A bill must be split into at least 1 part');
    }

    if (ways > MAX_SPLIT_WAYS) {
      throw new Error(`A bill cannot be split more than ${MAX_SPLIT_WAYS} ways`);
    }

    const baseCents = Math.floor(totalCents / ways);
    const remainder = totalCents % ways;

    return Array.from({ length: ways }, (_, index) =>
      index < remainder ? baseCents + 1 : baseCents
    );
  }
}
