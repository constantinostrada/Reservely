/**
 * Availability slots come back as UTC instants; the booking UI shows them in
 * the restaurant's local time and books by the same local wall-clock time the
 * backend expects (HH:mm). These helpers do that conversion with Intl, the
 * same time-zone source the backend uses — no extra dependency.
 */

/** Local wall-clock "HH:mm" of a UTC instant in the given IANA time zone. */
export function localTimeValue(isoInstant: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(isoInstant));

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '00';

  // Some ICU versions render midnight as hour 24.
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${hour}:${get('minute')}`;
}

/** Human-friendly label of a UTC instant in the given zone, e.g. "6:30 PM". */
export function localTimeLabel(isoInstant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoInstant));
}

/** Today's date as YYYY-MM-DD in the viewer's local time zone. */
export function todayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
