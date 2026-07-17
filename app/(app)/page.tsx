import { OperationsDashboard } from '@interfaces/web/features/dashboard/OperationsDashboard';

/**
 * Home / operations dashboard: the day-to-day view of upcoming reservations
 * with their orders and payment status. Thin wrapper — the flow lives in the
 * OperationsDashboard feature component.
 */
export default function DashboardPage(): JSX.Element {
  return <OperationsDashboard />;
}
