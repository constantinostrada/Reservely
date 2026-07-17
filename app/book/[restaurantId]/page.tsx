import { BookingFlow } from '@interfaces/web/features/booking/BookingFlow';

/**
 * Booking page for a single restaurant. Thin wrapper: the flow (search →
 * slots → guest form → confirmation) lives in the BookingFlow feature
 * component.
 */
export default function RestaurantBookingPage({
  params,
}: {
  params: { restaurantId: string };
}): JSX.Element {
  return <BookingFlow restaurantId={params.restaurantId} />;
}
