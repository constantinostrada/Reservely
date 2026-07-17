import { ReservationOrdering } from '@interfaces/web/features/orders/ReservationOrdering';

/**
 * Ordering + bill-split screen for one reservation. Thin wrapper: the flow
 * lives in the ReservationOrdering feature component.
 */
export default function ReservationOrderingPage({
  params,
}: {
  params: { id: string };
}): JSX.Element {
  return <ReservationOrdering reservationId={params.id} />;
}
