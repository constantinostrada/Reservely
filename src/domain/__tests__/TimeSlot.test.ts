import { TimeSlot } from '../value-objects/TimeSlot';
import { ValidationException } from '../exceptions/DomainException';

const at = (iso: string) => new Date(iso);

describe('TimeSlot', () => {
  it('rejects a slot whose end is not after its start', () => {
    expect(
      () => new TimeSlot(at('2026-07-16T18:00:00Z'), at('2026-07-16T18:00:00Z'))
    ).toThrow(ValidationException);
    expect(
      () => new TimeSlot(at('2026-07-16T18:00:00Z'), at('2026-07-16T17:00:00Z'))
    ).toThrow(ValidationException);
  });

  it('rejects invalid dates', () => {
    expect(
      () => new TimeSlot(new Date('nonsense'), at('2026-07-16T18:00:00Z'))
    ).toThrow(ValidationException);
  });

  it('builds a slot from a start and duration', () => {
    const slot = TimeSlot.fromDuration(at('2026-07-16T18:00:00Z'), 90);
    expect(slot.end.toISOString()).toBe('2026-07-16T19:30:00.000Z');
    expect(slot.durationMinutes).toBe(90);
  });

  it('is immutable against mutation of the input dates', () => {
    const start = at('2026-07-16T18:00:00Z');
    const slot = TimeSlot.fromDuration(start, 90);
    start.setUTCFullYear(1999);
    expect(slot.start.toISOString()).toBe('2026-07-16T18:00:00.000Z');
  });

  describe('overlaps', () => {
    const base = new TimeSlot(
      at('2026-07-16T18:00:00Z'),
      at('2026-07-16T19:30:00Z')
    );

    it('detects a partial overlap', () => {
      const other = new TimeSlot(
        at('2026-07-16T19:00:00Z'),
        at('2026-07-16T20:30:00Z')
      );
      expect(base.overlaps(other)).toBe(true);
      expect(other.overlaps(base)).toBe(true);
    });

    it('detects containment', () => {
      const inner = new TimeSlot(
        at('2026-07-16T18:30:00Z'),
        at('2026-07-16T19:00:00Z')
      );
      expect(base.overlaps(inner)).toBe(true);
      expect(inner.overlaps(base)).toBe(true);
    });

    it('treats back-to-back slots as non-overlapping (half-open)', () => {
      const next = new TimeSlot(
        at('2026-07-16T19:30:00Z'),
        at('2026-07-16T21:00:00Z')
      );
      expect(base.overlaps(next)).toBe(false);
      expect(next.overlaps(base)).toBe(false);
    });

    it('treats disjoint slots as non-overlapping', () => {
      const later = new TimeSlot(
        at('2026-07-16T21:00:00Z'),
        at('2026-07-16T22:30:00Z')
      );
      expect(base.overlaps(later)).toBe(false);
    });
  });

  describe('isWithin', () => {
    const window = new TimeSlot(
      at('2026-07-16T15:00:00Z'),
      at('2026-07-17T02:00:00Z')
    );

    it('accepts a slot fully inside the window, including boundaries', () => {
      expect(
        new TimeSlot(at('2026-07-16T15:00:00Z'), at('2026-07-16T16:30:00Z')).isWithin(window)
      ).toBe(true);
      expect(
        new TimeSlot(at('2026-07-17T00:30:00Z'), at('2026-07-17T02:00:00Z')).isWithin(window)
      ).toBe(true);
    });

    it('rejects a slot sticking out of the window', () => {
      expect(
        new TimeSlot(at('2026-07-17T01:00:00Z'), at('2026-07-17T02:30:00Z')).isWithin(window)
      ).toBe(false);
      expect(
        new TimeSlot(at('2026-07-16T14:00:00Z'), at('2026-07-16T15:30:00Z')).isWithin(window)
      ).toBe(false);
    });
  });
});
