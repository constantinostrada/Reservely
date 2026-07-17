import { Checkout } from '@interfaces/web/features/checkout/Checkout';

/**
 * Checkout + confirmation screen for one order's bill. Thin wrapper: the flow
 * lives in the Checkout feature component.
 */
export default function CheckoutPage({
  params,
}: {
  params: { id: string };
}): JSX.Element {
  return <Checkout orderId={params.id} />;
}
