import { TableCombinationService } from '../services/TableCombinationService';
import { Table } from '../entities/Table';
import { TableStatus } from '../value-objects/TableStatus';

const makeTable = (
  id: string,
  capacity: number,
  location: string | undefined,
  status = TableStatus.available()
) =>
  new Table({
    id,
    restaurantId: 'rest-1',
    tableNumber: Number(id.replace(/\D/g, '')) || 1,
    capacity,
    location,
    status,
  });

describe('TableCombinationService', () => {
  const service = new TableCombinationService();

  it('combines two same-location tables whose seats sum to at least the party', () => {
    const tables = [
      makeTable('t-1', 4, 'patio'),
      makeTable('t-2', 4, 'patio'),
    ];

    const combos = service.findCombinations(tables, 8);

    expect(combos).toHaveLength(1);
    expect(combos[0].map((t) => t.id).sort()).toEqual(['t-1', 't-2']);
    expect(service.totalCapacity(combos[0])).toBe(8);
  });

  it('never combines tables from different locations', () => {
    const tables = [
      makeTable('t-1', 4, 'patio'),
      makeTable('t-2', 4, 'main-hall'),
    ];

    expect(service.findCombinations(tables, 8)).toEqual([]);
  });

  it('ignores tables with no location (adjacency unknown)', () => {
    const tables = [
      makeTable('t-1', 4, undefined),
      makeTable('t-2', 4, undefined),
    ];

    expect(service.findCombinations(tables, 8)).toEqual([]);
  });

  it('ignores unavailable tables', () => {
    const tables = [
      makeTable('t-1', 4, 'patio'),
      makeTable('t-2', 4, 'patio', TableStatus.unavailable()),
    ];

    expect(service.findCombinations(tables, 8)).toEqual([]);
  });

  it('excludes tables that already seat the party on their own', () => {
    // A 10-top alone seats a party of 6 → not a combination case; the lone
    // 2-top left over cannot reach 6, so no combination is offered.
    const tables = [
      makeTable('t-1', 10, 'patio'),
      makeTable('t-2', 2, 'patio'),
    ];

    expect(service.findCombinations(tables, 6)).toEqual([]);
  });

  it('prefers the combination with the fewest tables', () => {
    // Party of 8. Location A seats it with two tables (6 + 4); location B needs
    // three (3 + 3 + 3). The two-table combination should lead.
    const tables = [
      makeTable('a1', 6, 'A'),
      makeTable('a2', 4, 'A'),
      makeTable('b1', 3, 'B'),
      makeTable('b2', 3, 'B'),
      makeTable('b3', 3, 'B'),
    ];

    const combos = service.findCombinations(tables, 8);

    // Best-first: the two-table combination in A leads the three-table one.
    expect(combos).toHaveLength(2);
    expect(combos[0].map((t) => t.id).sort()).toEqual(['a1', 'a2']);
    expect(combos[1].map((t) => t.id).sort()).toEqual(['b1', 'b2', 'b3']);
  });

  it('returns nothing when even the largest allowed set falls short', () => {
    // Party of 20 but only 4-tops; capped at MAX_COMBINATION_TABLES (3) → 12 < 20.
    const tables = [
      makeTable('t-1', 4, 'patio'),
      makeTable('t-2', 4, 'patio'),
      makeTable('t-3', 4, 'patio'),
      makeTable('t-4', 4, 'patio'),
    ];

    expect(service.findCombinations(tables, 20)).toEqual([]);
  });

  it('picks the largest tables first to minimise the table count', () => {
    const tables = [
      makeTable('t-1', 2, 'patio'),
      makeTable('t-2', 6, 'patio'),
      makeTable('t-3', 4, 'patio'),
    ];

    const combos = service.findCombinations(tables, 8);

    // 6 + 4 = 10 ≥ 8 in two tables, rather than 2 + 6 + 4.
    expect(combos[0].map((t) => t.id).sort()).toEqual(['t-2', 't-3']);
  });
});
