import { ValidationException } from '../exceptions/DomainException';

/**
 * An immutable half-open time interval [start, end) in UTC.
 *
 * All slot math in the domain happens on UTC instants; converting to and
 * from a restaurant's local wall-clock time is the job of the outer layers.
 * Half-open semantics mean back-to-back slots (one ending exactly when the
 * next starts) do NOT overlap.
 */
export class TimeSlot {
  private readonly _start: Date;
  private readonly _end: Date;

  constructor(start: Date, end: Date) {
    if (
      !(start instanceof Date) ||
      !(end instanceof Date) ||
      isNaN(start.getTime()) ||
      isNaN(end.getTime())
    ) {
      throw new ValidationException('Time slot requires valid dates');
    }
    if (end.getTime() <= start.getTime()) {
      throw new ValidationException('Time slot end must be after its start');
    }
    // Copy so external mutation of the passed Dates cannot corrupt the slot
    this._start = new Date(start.getTime());
    this._end = new Date(end.getTime());
  }

  static fromDuration(start: Date, durationMinutes: number): TimeSlot {
    return new TimeSlot(
      start,
      new Date(start.getTime() + durationMinutes * 60_000)
    );
  }

  get start(): Date {
    return new Date(this._start.getTime());
  }

  get end(): Date {
    return new Date(this._end.getTime());
  }

  get durationMinutes(): number {
    return (this._end.getTime() - this._start.getTime()) / 60_000;
  }

  public overlaps(other: TimeSlot): boolean {
    return (
      this._start.getTime() < other._end.getTime() &&
      this._end.getTime() > other._start.getTime()
    );
  }

  /** True when this slot lies entirely inside `other`. */
  public isWithin(other: TimeSlot): boolean {
    return (
      this._start.getTime() >= other._start.getTime() &&
      this._end.getTime() <= other._end.getTime()
    );
  }

  public equals(other: TimeSlot): boolean {
    return (
      this._start.getTime() === other._start.getTime() &&
      this._end.getTime() === other._end.getTime()
    );
  }
}
