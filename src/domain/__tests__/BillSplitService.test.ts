import { BillSplitService, MAX_SPLIT_WAYS } from '../services/BillSplitService';

describe('BillSplitService', () => {
  const service = new BillSplitService();

  it('splits an evenly divisible total into equal shares', () => {
    expect(service.split(1200, 4)).toEqual([300, 300, 300, 300]);
  });

  it('distributes the remainder of a non-divisible total to the first shares', () => {
    expect(service.split(1000, 3)).toEqual([334, 333, 333]);
  });

  it('handles a remainder spread over several shares', () => {
    expect(service.split(1003, 5)).toEqual([201, 201, 201, 200, 200]);
  });

  it('always sums back to the exact total', () => {
    const totals = [0, 1, 2, 999, 1000, 5485, 99999, 100003];
    for (const total of totals) {
      for (let ways = 1; ways <= 10; ways++) {
        const shares = service.split(total, ways);
        expect(shares).toHaveLength(ways);
        expect(shares.reduce((sum, s) => sum + s, 0)).toBe(total);
        expect(shares.every((s) => Number.isInteger(s))).toBe(true);
      }
    }
  });

  it('is deterministic — the same input always yields the same shares', () => {
    expect(service.split(1000, 3)).toEqual(service.split(1000, 3));
  });

  it('splits a total smaller than the number of ways', () => {
    expect(service.split(2, 3)).toEqual([1, 1, 0]);
  });

  it('returns the whole total for a single-way split', () => {
    expect(service.split(5400, 1)).toEqual([5400]);
  });

  it('rejects fractional-cent totals', () => {
    expect(() => service.split(10.5, 2)).toThrow(
      'Total must be a non-negative integer amount in cents'
    );
  });

  it('rejects negative totals', () => {
    expect(() => service.split(-100, 2)).toThrow(
      'Total must be a non-negative integer amount in cents'
    );
  });

  it('rejects zero or non-integer ways', () => {
    expect(() => service.split(1000, 0)).toThrow(
      'A bill must be split into at least 1 part'
    );
    expect(() => service.split(1000, 2.5)).toThrow(
      'A bill must be split into at least 1 part'
    );
  });

  it('rejects splitting more than the maximum number of ways', () => {
    expect(() => service.split(1000, MAX_SPLIT_WAYS + 1)).toThrow(
      `A bill cannot be split more than ${MAX_SPLIT_WAYS} ways`
    );
  });
});
