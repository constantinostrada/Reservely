export interface CreateReservationDTO {
  restaurantId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  date: string; // ISO date string
  time: string; // HH:MM format
  partySize: number;
  notes?: string;
}

export interface UpdateReservationDTO {
  guestName?: string;
  guestPhone?: string;
  date?: string;
  time?: string;
  partySize?: number;
  notes?: string;
}

export interface ReservationDTO {
  id: string;
  restaurantId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  date: string;
  time: string;
  partySize: number;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationListDTO {
  reservations: ReservationDTO[];
  total: number;
}
