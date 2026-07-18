import { Table } from '../entities/Table';

/**
 * Upper bound on how many tables may be pushed together for one party. Keeps
 * combinations physically plausible and the search space small.
 */
export const MAX_COMBINATION_TABLES = 3;

/**
 * Decides which tables may be combined to seat a party too large for any single
 * table. Combination rule (domain policy):
 *  - same restaurant (all tables passed in already belong to one restaurant),
 *  - adjacent: modelled as sharing the same non-null `location` (tables in the
 *    same area of the room can be pushed together),
 *  - available (not reserved/unavailable),
 *  - summed capacity ≥ party size.
 *
 * Only tables that individually cannot seat the party take part in a
 * combination — a party that fits at one table should never be split.
 */
export class TableCombinationService {
  /**
   * Candidate combinations for the party, best-first. Each candidate is a set
   * of same-location tables whose seats sum to at least the party size. Ranked
   * by fewest tables, then least wasted capacity. Empty when no combination is
   * possible. Callers try candidates in order (e.g. against a transactional
   * multi-table hold) until one sticks.
   */
  public findCombinations(
    availableTables: Table[],
    partySize: number
  ): Table[][] {
    // Only tables that (a) are available, (b) sit in a known area, and (c) do
    // not on their own seat the party are eligible to be combined.
    const eligible = availableTables.filter(
      (table) =>
        table.isAvailable() &&
        table.location != null &&
        table.location.trim().length > 0 &&
        table.capacity < partySize
    );

    const byLocation = new Map<string, Table[]>();
    for (const table of eligible) {
      const key = table.location as string;
      const group = byLocation.get(key) ?? [];
      group.push(table);
      byLocation.set(key, group);
    }

    const candidates: Table[][] = [];
    // Deterministic order across locations.
    for (const location of [...byLocation.keys()].sort()) {
      const combo = this.greedyCombination(
        byLocation.get(location) as Table[],
        partySize
      );
      if (combo) {
        candidates.push(combo);
      }
    }

    // Fewest tables first, then the tightest fit (least wasted capacity).
    candidates.sort(
      (a, b) =>
        a.length - b.length ||
        this.wastedCapacity(a, partySize) - this.wastedCapacity(b, partySize)
    );

    return candidates;
  }

  /** Total seats of a combination. */
  public totalCapacity(tables: Table[]): number {
    return tables.reduce((sum, table) => sum + table.capacity, 0);
  }

  /**
   * Greedily builds one combination from a single location's tables: largest
   * tables first so the party is seated with the fewest tables, capped at
   * MAX_COMBINATION_TABLES. Returns null when even the largest allowed set
   * cannot reach the party size (or fewer than two tables are involved).
   */
  private greedyCombination(
    group: Table[],
    partySize: number
  ): Table[] | null {
    const sorted = [...group].sort(
      (a, b) => b.capacity - a.capacity || a.tableNumber - b.tableNumber
    );

    const picked: Table[] = [];
    let seats = 0;
    for (const table of sorted) {
      if (picked.length >= MAX_COMBINATION_TABLES) {
        break;
      }
      picked.push(table);
      seats += table.capacity;
      if (seats >= partySize && picked.length >= 2) {
        return picked;
      }
    }

    return null;
  }

  private wastedCapacity(tables: Table[], partySize: number): number {
    return this.totalCapacity(tables) - partySize;
  }
}
