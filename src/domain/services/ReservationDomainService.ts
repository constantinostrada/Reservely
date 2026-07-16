import { Reservation } from '../entities/Reservation';
import { Table } from '../entities/Table';

export class ReservationDomainService {
  public canAccommodateReservation(
    reservation: Reservation,
    availableTables: Table[]
  ): boolean {
    return availableTables.some((table) =>
      table.canAccommodate(reservation.partySize)
    );
  }

  public findSuitableTables(
    partySize: number,
    availableTables: Table[]
  ): Table[] {
    return availableTables
      .filter((table) => table.canAccommodate(partySize))
      .sort((a, b) => a.capacity - b.capacity);
  }

  public isReservationInValidTimeSlot(reservation: Reservation): boolean {
    const [hours, minutes] = reservation.time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    // Restaurant hours: 11:00 AM to 10:00 PM
    const openingTime = 11 * 60; // 11:00 AM
    const closingTime = 22 * 60; // 10:00 PM

    return totalMinutes >= openingTime && totalMinutes <= closingTime;
  }

  public calculateReservationEndTime(
    startTime: string,
    durationMinutes: number = 90
  ): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;

    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;

    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  }

  public hasConflict(
    newReservation: Reservation,
    existingReservations: Reservation[]
  ): boolean {
    const newDateTime = this.parseDateTime(
      newReservation.date,
      newReservation.time
    );
    const newEndTime = this.calculateEndDateTime(newDateTime, 90);

    return existingReservations.some((existing) => {
      if (existing.status.isCancelled()) {
        return false;
      }

      const existingDateTime = this.parseDateTime(existing.date, existing.time);
      const existingEndTime = this.calculateEndDateTime(existingDateTime, 90);

      // Check for overlap
      return (
        (newDateTime >= existingDateTime && newDateTime < existingEndTime) ||
        (newEndTime > existingDateTime && newEndTime <= existingEndTime) ||
        (newDateTime <= existingDateTime && newEndTime >= existingEndTime)
      );
    });
  }

  private parseDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const dateTime = new Date(date);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  }

  private calculateEndDateTime(
    startDateTime: Date,
    durationMinutes: number
  ): Date {
    return new Date(startDateTime.getTime() + durationMinutes * 60000);
  }
}
