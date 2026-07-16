import { ValidationException } from '@domain/exceptions/DomainException';
import { TimeSlot } from '@domain/value-objects/TimeSlot';

/**
 * Wall-clock ⇄ UTC conversion at the application boundary.
 *
 * Everything inside the domain works on UTC instants; these helpers convert
 * a restaurant-local date + time (e.g. "2026-07-16" + "18:30" in
 * "America/New_York") into the corresponding UTC instant using the IANA
 * time zone database via Intl — no third-party dependency, DST-correct.
 */

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      throw new ValidationException(`Unknown time zone: ${timeZone}`);
    }
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** The instant's wall-clock reading in `timeZone`, re-encoded as a UTC ms value. */
function wallClockAsUtcMs(instant: Date, timeZone: string): number {
  const parts = getFormatter(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  // Some ICU versions report midnight as hour 24
  const hour = get('hour') === 24 ? 0 : get('hour');
  return Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second')
  );
}

/**
 * Convert a local calendar date ("YYYY-MM-DD") and time ("HH:mm") in the
 * given IANA time zone to the UTC instant it denotes.
 *
 * DST edge cases are resolved deterministically: a wall-clock time skipped
 * by spring-forward maps to the closest valid instant after the gap; an
 * ambiguous fall-back time resolves to one of its two instants.
 */
export function zonedTimeToUtc(
  dateISO: string,
  time: string,
  timeZone: string
): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!dateMatch) {
    throw new ValidationException(`Invalid date: ${dateISO} (expected YYYY-MM-DD)`);
  }
  if (!timeMatch) {
    throw new ValidationException(`Invalid time: ${time} (expected HH:mm)`);
  }

  const desiredWallClockMs = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2])
  );

  // Fixed-point iteration on the zone offset: two passes converge for every
  // real time zone, including across DST transitions.
  let utcMs = desiredWallClockMs;
  for (let i = 0; i < 2; i++) {
    const offsetMs = wallClockAsUtcMs(new Date(utcMs), timeZone) - utcMs;
    utcMs = desiredWallClockMs - offsetMs;
  }
  return new Date(utcMs);
}

/**
 * The UTC time slot covering a local [openTime, closeTime) window on the
 * given local calendar date. Correct across day boundaries (a zone ahead of
 * UTC can open on the previous UTC day) and on DST transition days.
 */
export function localWindowToUtcSlot(
  dateISO: string,
  openTime: string,
  closeTime: string,
  timeZone: string
): TimeSlot {
  return new TimeSlot(
    zonedTimeToUtc(dateISO, openTime, timeZone),
    zonedTimeToUtc(dateISO, closeTime, timeZone)
  );
}
