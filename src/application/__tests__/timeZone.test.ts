import { zonedTimeToUtc, localWindowToUtcSlot } from '../common/timeZone';
import { ValidationException } from '@domain/exceptions/DomainException';

describe('zonedTimeToUtc', () => {
  it('converts a UTC-zone wall clock 1:1', () => {
    expect(zonedTimeToUtc('2026-07-16', '18:30', 'UTC').toISOString()).toBe(
      '2026-07-16T18:30:00.000Z'
    );
  });

  it('converts US Eastern in summer (EDT, UTC-4)', () => {
    expect(
      zonedTimeToUtc('2026-07-16', '18:30', 'America/New_York').toISOString()
    ).toBe('2026-07-16T22:30:00.000Z');
  });

  it('converts US Eastern in winter (EST, UTC-5)', () => {
    expect(
      zonedTimeToUtc('2026-01-15', '18:30', 'America/New_York').toISOString()
    ).toBe('2026-01-15T23:30:00.000Z');
  });

  it('crosses the UTC day boundary for zones ahead of UTC', () => {
    // NZST is UTC+12 in July (southern winter): 11:00 local = 23:00 the
    // PREVIOUS day in UTC
    expect(
      zonedTimeToUtc('2026-07-16', '11:00', 'Pacific/Auckland').toISOString()
    ).toBe('2026-07-15T23:00:00.000Z');
  });

  it('crosses the UTC day boundary for late-evening times behind UTC', () => {
    // 21:30 in Los Angeles (PDT, UTC-7) is 04:30 the NEXT day in UTC
    expect(
      zonedTimeToUtc('2026-07-16', '21:30', 'America/Los_Angeles').toISOString()
    ).toBe('2026-07-17T04:30:00.000Z');
  });

  it('resolves a nonexistent spring-forward time to a valid instant', () => {
    // 2026-03-08 02:30 does not exist in America/New_York (clocks jump
    // 02:00 → 03:00). Both neighbouring interpretations are acceptable.
    const result = zonedTimeToUtc('2026-03-08', '02:30', 'America/New_York');
    expect([
      '2026-03-08T06:30:00.000Z', // as if EST still applied
      '2026-03-08T07:30:00.000Z', // as if EDT already applied
    ]).toContain(result.toISOString());
  });

  it('resolves an ambiguous fall-back time to one of its two instants', () => {
    // 2026-11-01 01:30 happens twice in America/New_York (EDT and EST)
    const result = zonedTimeToUtc('2026-11-01', '01:30', 'America/New_York');
    expect([
      '2026-11-01T05:30:00.000Z', // EDT reading
      '2026-11-01T06:30:00.000Z', // EST reading
    ]).toContain(result.toISOString());
  });

  it('stays consistent across a DST boundary day for normal times', () => {
    // Well after the 02:00 transition, EDT (UTC-4) applies
    expect(
      zonedTimeToUtc('2026-03-08', '18:00', 'America/New_York').toISOString()
    ).toBe('2026-03-08T22:00:00.000Z');
  });

  it('rejects malformed dates, times and unknown zones', () => {
    expect(() => zonedTimeToUtc('16/07/2026', '18:00', 'UTC')).toThrow(
      ValidationException
    );
    expect(() => zonedTimeToUtc('2026-07-16', '25:00', 'UTC')).toThrow(
      ValidationException
    );
    expect(() =>
      zonedTimeToUtc('2026-07-16', '18:00', 'Mars/Olympus_Mons')
    ).toThrow(ValidationException);
  });
});

describe('localWindowToUtcSlot', () => {
  it('produces the UTC window for local opening hours', () => {
    const slot = localWindowToUtcSlot(
      '2026-07-16',
      '11:00',
      '22:00',
      'America/New_York'
    );
    expect(slot.start.toISOString()).toBe('2026-07-16T15:00:00.000Z');
    expect(slot.end.toISOString()).toBe('2026-07-17T02:00:00.000Z');
  });

  it('yields a 1-hour-shorter real window on spring-forward day', () => {
    const normalDay = localWindowToUtcSlot(
      '2026-03-07',
      '00:30',
      '11:00',
      'America/New_York'
    );
    const dstDay = localWindowToUtcSlot(
      '2026-03-08',
      '00:30',
      '11:00',
      'America/New_York'
    );
    expect(normalDay.durationMinutes).toBe(630);
    // The 02:00–03:00 hour does not exist on 2026-03-08
    expect(dstDay.durationMinutes).toBe(570);
  });
});
