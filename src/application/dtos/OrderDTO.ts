export interface PlaceOrderItemDTO {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

export interface PlaceOrderDTO {
  reservationId: string;
  items: PlaceOrderItemDTO[];
  /** Integer cents. */
  tipCents?: number;
  notes?: string;
}

export interface OrderItemDTO {
  id: string;
  menuItemId: string;
  itemName: string;
  quantity: number;
  /** Snapshot of the menu item price at order time, integer cents. */
  unitPriceCents: number;
  /** quantity × unitPriceCents, integer cents. */
  lineTotalCents: number;
  notes?: string;
}

export interface OrderDTO {
  id: string;
  restaurantId: string;
  reservationId?: string;
  tableId?: string;
  status: string;
  items: OrderItemDTO[];
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListDTO {
  orders: OrderDTO[];
  total: number;
}
