# Reservely API Documentation

Base URL: `http://localhost:3000/api`

> All endpoints except `POST /restaurants`, `POST /auth/login`,
> `POST /webhooks/payments` and `GET /health` require authentication: a
> `Bearer` token in the `Authorization` header or the `auth_token` httpOnly
> cookie (set by login). Every request is scoped to the restaurant in the token.

## Authentication

### Login

```http
POST /auth/login
Content-Type: application/json
```

**Request Body**

```json
{
  "email": "owner@trattoria-bella.example",
  "password": "password123"
}
```

**Response** (200 OK) — also sets the `auth_token` httpOnly cookie.

```json
{
  "token": "<jwt>",
  "user": {
    "id": "cuid",
    "restaurantId": "cuid",
    "email": "owner@trattoria-bella.example",
    "name": "Giulia Rossi",
    "role": "OWNER"
  }
}
```

Returns `401 Unauthorized` for unknown email or wrong password.

### Logout

```http
POST /auth/logout
```

Clears the `auth_token` cookie. JWTs are stateless, so this only discards the
session cookie. **Response** (200 OK): `{ "success": true }`.

### Current User

```http
GET /auth/me
```

**Response** (200 OK): the authenticated `user` object (same shape as the
`user` field of the login response).

## Restaurants

### Create Restaurant (public — tenant onboarding)

```http
POST /restaurants
Content-Type: application/json
```

**Request Body**

```json
{
  "name": "La Trattoria",
  "slug": "la-trattoria",
  "timezone": "America/New_York",
  "currency": "USD",
  "address": "123 Main St",
  "phone": "+1234567890",
  "noShowGraceMinutes": 15
}
```

`noShowGraceMinutes` is optional (default `15`, integer `0`–`1440`): minutes
past a reservation's start before an unseated guest counts as a no-show.

**Response** (201 Created)

```json
{
  "id": "cuid",
  "name": "La Trattoria",
  "slug": "la-trattoria",
  "timezone": "America/New_York",
  "currency": "USD",
  "address": "123 Main St",
  "phone": "+1234567890",
  "noShowGraceMinutes": 15,
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z"
}
```

Returns `409 Conflict` if the slug is already taken.

### List Restaurants

```http
GET /restaurants
```

Tenant-scoped: returns only the caller's own restaurant.

**Response**

```json
{
  "restaurants": [{ "id": "cuid", "name": "La Trattoria", "...": "..." }],
  "total": 1
}
```

### Get Restaurant by ID

```http
GET /restaurants/:id
```

Returns `403 Forbidden` for another tenant's restaurant, `404` if missing.

### Update Restaurant

```http
PATCH /restaurants/:id
Content-Type: application/json
```

Partial update of `name`, `timezone`, `currency`, `address`, `phone`,
`noShowGraceMinutes`. The `slug` is immutable.

### Delete Restaurant

```http
DELETE /restaurants/:id
```

Owner role only (`403` otherwise). Cascades to everything the restaurant
owns. **Response**: `204 No Content`.

## Reservations

Clients send the reservation's **restaurant-local** calendar `date`
(`YYYY-MM-DD`) and wall-clock `time` (`HH:MM`); the server converts them to UTC
instants using the restaurant's time zone. Responses therefore carry `startsAt`
and `endsAt` as UTC ISO-8601 instants (not the original `date`/`time` pair).
Every reservation entity shares this shape:

```json
{
  "id": "uuid",
  "restaurantId": "cuid",
  "tableId": "cuid",
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890",
  "startsAt": "2024-01-15T18:30:00.000Z",
  "endsAt": "2024-01-15T20:00:00.000Z",
  "partySize": 4,
  "status": "pending",
  "notes": "Window seat preferred",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T10:00:00.000Z"
}
```

### List All Reservations

```http
GET /reservations
```

**Response**: `{ "reservations": [ <reservation> ], "total": 1 }`.

### Create Reservation

```http
POST /reservations
Content-Type: application/json
```

**Request Body**

```json
{
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890",
  "date": "2024-01-15",
  "time": "18:30",
  "partySize": 4,
  "tableId": "cuid",
  "notes": "Window seat preferred"
}
```

`tableId` is optional: when omitted the smallest suitable free table is
auto-assigned. **Response** (201 Created): the created reservation (status
`pending`).

Returns `400 Bad Request` when the time is outside operating hours or no table
fits the party, and `409 Conflict` when the requested table/slot is already
held (see double-booking below).

### Get Reservation by ID

```http
GET /reservations/:id
```

**Response** (200 OK): the reservation.

### Modify Reservation (reschedule / resize)

```http
PATCH /reservations/:id
Content-Type: application/json
```

**Request Body** (all fields optional, at least one required)

```json
{
  "date": "2026-08-02",
  "time": "20:00",
  "partySize": 8,
  "guestName": "John Doe",
  "guestPhone": "+1234567890",
  "notes": "Anniversary"
}
```

`date`/`time` are restaurant-local; whichever half is omitted is carried over
from the current start time. Only `pending`/`confirmed` reservations can be
modified, and a new slot must be in the future and inside service hours.

The move is an **atomic swap**: the new table/slot hold is taken and the old
one released in a single transaction, so if the new hold fails nothing
changes — the guest never loses their booking. The reservation keeps its id.
If the party outgrows every single table, the booking falls back to a
combination of adjacent tables (one row per table, shared `combinationId`);
shrinking back releases the extra tables. Tables freed by a successful move
are offered to the waitlist.

**Response** (200 OK): the updated reservation. Returns `409 Conflict` when
the requested slot is already taken on every suitable table, `400` when no
table (or combination) can seat the party or the new time is invalid.

### Confirm Reservation

```http
POST /reservations/:id/confirm
```

**Response** (200 OK): the reservation with status `confirmed`. Returns `422`
when the reservation is cancelled/completed.

### Cancel Reservation

```http
POST /reservations/:id/cancel
```

**Response** (200 OK): the reservation with status `cancelled`. Cancelling
frees the table's slot for a new booking.

### No-show Sweep

```http
POST /reservations/no-show-sweep
```

Admin/maintenance: marks every reservation still `pending`/`confirmed` whose
start time passed the restaurant's `noShowGraceMinutes` as `no_show`, freeing
its table(s) and promoting the next eligible waitlist entry into each freed
table (the guest is notified). Seated, cancelled and completed reservations
are never touched, and a reservation is released exactly once — the endpoint
is idempotent and safe to call from a scheduled job.

**Response** (200 OK)

```json
{
  "markedNoShow": 2,
  "promoted": 1
}
```

## Availability

### Get Table Availability

```http
GET /availability?date=2024-01-15&partySize=4
```

Returns the free reservation slots for each table that can seat the party on
the given restaurant-local date. Slots are half-open `[startsAt, endsAt)` UTC
instants at a fixed interval within operating hours; a slot already held by a
live reservation is omitted.

**Query params**

- `date`: required, `YYYY-MM-DD` (restaurant local time)
- `partySize`: required, integer 1–50

**Response** (200 OK)

```json
{
  "restaurantId": "cuid",
  "date": "2024-01-15",
  "timezone": "America/New_York",
  "partySize": 4,
  "slotDurationMinutes": 90,
  "tables": [
    {
      "tableId": "cuid",
      "tableNumber": 3,
      "capacity": 4,
      "location": "main room",
      "freeSlots": [
        {
          "startsAt": "2024-01-15T16:00:00.000Z",
          "endsAt": "2024-01-15T17:30:00.000Z"
        }
      ]
    }
  ]
}
```

## Public Booking

Unauthenticated, customer-facing endpoints for the guest booking flow (F3).
No session is required; the restaurant is always named in the URL. Availability
and reservation creation reuse the same engine as the tenant-scoped endpoints,
so a slot taken between viewing and booking fails with `409 Conflict` rather
than double-booking.

### List Restaurants (public directory)

```http
GET /public/restaurants
```

Returns every restaurant so a guest can pick one to book at.

**Response** (200 OK) — same shape as `GET /restaurants` (`{ restaurants, total }`).

### Get Restaurant (public)

```http
GET /public/restaurants/:restaurantId
```

**Response** (200 OK) — a single `RestaurantDTO`. `404` if it does not exist.

### Get Availability (public)

```http
GET /public/restaurants/:restaurantId/availability?date=2024-01-15&partySize=4
```

Same query params and response shape as `GET /availability`, but scoped to the
restaurant in the path instead of the authenticated tenant.

### Create Reservation (public)

```http
POST /public/restaurants/:restaurantId/reservations
```

Body and response are identical to `POST /reservations` (guest details + local
`date`/`time` + `partySize`, optional `tableId`/`notes`). The reservation use
case places a transactional slot hold; if the slot was taken since availability
was fetched, responds `409 Conflict`.

## Tables

### List All Tables

```http
GET /tables
```

**Response**

```json
{
  "tables": [
    {
      "id": "uuid",
      "tableNumber": 1,
      "capacity": 4,
      "location": "Window",
      "status": "available",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

### Create Table

```http
POST /tables
Content-Type: application/json
```

**Request Body**

```json
{
  "tableNumber": 1,
  "capacity": 4,
  "location": "Window"
}
```

**Response** (201 Created)

```json
{
  "id": "uuid",
  "tableNumber": 1,
  "capacity": 4,
  "location": "Window",
  "status": "available",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z"
}
```

### Get Table by ID

```http
GET /tables/:id
```

Returns `403 Forbidden` for another tenant's table, `404` if missing.

### Update Table

```http
PATCH /tables/:id
Content-Type: application/json
```

**Request Body** (all fields optional)

```json
{
  "tableNumber": 2,
  "capacity": 6,
  "location": "Patio",
  "status": "unavailable"
}
```

Returns `409 Conflict` when renumbering onto an existing table number.

### Delete Table

```http
DELETE /tables/:id
```

**Response**: `204 No Content`.

## Menu Items

All amounts are integer cents of the restaurant's currency.

### List Menu Items

```http
GET /menu-items
```

**Response**

```json
{
  "menuItems": [
    {
      "id": "cuid",
      "restaurantId": "cuid",
      "name": "Margherita",
      "description": "Tomato, mozzarella, basil",
      "category": "pizza",
      "priceCents": 1250,
      "isAvailable": true,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

### Create Menu Item

```http
POST /menu-items
Content-Type: application/json
```

**Request Body**

```json
{
  "name": "Margherita",
  "description": "Tomato, mozzarella, basil",
  "category": "pizza",
  "priceCents": 1250,
  "isAvailable": true
}
```

**Response** (201 Created): the created menu item.

Returns `409 Conflict` when the name already exists in the restaurant.

### Get Menu Item by ID

```http
GET /menu-items/:id
```

### Update Menu Item

```http
PATCH /menu-items/:id
Content-Type: application/json
```

All fields optional: `name`, `description`, `category`, `priceCents`, `isAvailable`.

### Delete Menu Item

```http
DELETE /menu-items/:id
```

**Response**: `204 No Content`.

Returns `409 Conflict` when the item is referenced by existing orders.

## Orders

Orders are placed against a live reservation. Each line item snapshots the
menu item's name and price at order time, so later menu edits don't change
past orders. All amounts are integer cents.

### List Orders

```http
GET /orders
GET /orders?reservationId=:reservationId
```

**Response**

```json
{
  "orders": [ { "id": "...", "items": [ ... ], "totalCents": 5400 } ],
  "total": 1
}
```

### Place Order

```http
POST /orders
Content-Type: application/json
```

**Request Body**

```json
{
  "reservationId": "cuid",
  "items": [
    { "menuItemId": "cuid", "quantity": 2 },
    { "menuItemId": "cuid", "quantity": 3, "notes": "no onions" }
  ],
  "tipCents": 500,
  "notes": "anniversary dinner"
}
```

**Response** (201 Created)

```json
{
  "id": "uuid",
  "restaurantId": "cuid",
  "reservationId": "cuid",
  "tableId": "cuid",
  "status": "open",
  "items": [
    {
      "id": "uuid",
      "menuItemId": "cuid",
      "itemName": "Tagliatelle al ragù",
      "quantity": 2,
      "unitPriceCents": 1550,
      "lineTotalCents": 3100
    }
  ],
  "subtotalCents": 3100,
  "taxCents": 0,
  "tipCents": 500,
  "totalCents": 3600,
  "notes": "anniversary dinner",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T10:00:00.000Z"
}
```

Returns `404 Not Found` for an unknown reservation or menu item,
`422 Unprocessable Entity` when the reservation is cancelled/completed/no-show
or a menu item is unavailable.

### Get Order by ID

```http
GET /orders/:id
```

### Split Bill

```http
GET /orders/:id/split?ways=3
```

Splits the order's total among `ways` diners. Shares are integer cents and
always sum back to the exact total: every share is `floor(total / ways)` and
the remainder is distributed one cent at a time to the first shares
(deterministic — the same input always yields the same shares).

**Response**

```json
{
  "orderId": "uuid",
  "subtotalCents": 1000,
  "taxCents": 0,
  "tipCents": 0,
  "totalCents": 1000,
  "ways": 3,
  "shareCents": [334, 333, 333]
}
```

- `ways`: required, integer between 1-50

## Payments

Charging is asynchronous: `POST /orders/:id/charge` opens a `pending` payment
and initiates the charge with the provider; the final outcome arrives later as
a provider webhook. All amounts are integer cents.

### Charge a Bill

```http
POST /orders/:id/charge
Content-Type: application/json
```

**Request Body** (optional — an empty body defaults `method` to `card`)

```json
{
  "method": "card"
}
```

`method` is one of `card`, `cash`, `online`.

**Response** (201 Created)

```json
{
  "id": "uuid",
  "restaurantId": "cuid",
  "orderId": "cuid",
  "amountCents": 2300,
  "tipCents": 300,
  "method": "card",
  "status": "pending",
  "externalRef": "ch_mock_...",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T10:00:00.000Z"
}
```

`amountCents` snapshots the order total (subtotal + tax + tip) at charge time.
Returns `404` for an unknown order, `422` when the order is cancelled, and
`409 Conflict` when the order already has a pending or succeeded payment (only
`failed`/`refunded` payments may be re-charged).

### List Payments (tenant-wide)

```http
GET /payments
```

Every payment for the tenant, newest first — the operations dashboard reads
this once and joins it to orders by `orderId`.

**Response** (200 OK)

```json
{
  "payments": [{ "id": "uuid", "orderId": "uuid", "status": "succeeded", "...": "..." }],
  "total": 1
}
```

### List Payments for an Order

```http
GET /orders/:id/payments
```

Every payment recorded against the order, oldest first — lets a client reflect
the current, webhook-settled state of a bill (`pending` → `succeeded`/`failed`).

**Response** (200 OK)

```json
{
  "payments": [{ "id": "uuid", "status": "succeeded", "...": "..." }],
  "total": 1
}
```

Returns `404` for an unknown order and `403` when the order belongs to another
tenant.

### Payment Webhook (provider → server)

```http
POST /webhooks/payments
Content-Type: application/json
```

Unauthenticated: the caller is the payment provider, not a signed-in user.
Deliveries are deduplicated by the provider **event id** (`id`), so replays —
even concurrent ones — settle the payment at most once.

**Request Body**

```json
{
  "id": "evt_provider_123",
  "type": "payment.succeeded",
  "data": { "externalRef": "ch_mock_..." }
}
```

- `id`: provider event id (the idempotency key), not the payment id
- `type`: `payment.succeeded` or `payment.failed`
- `data.externalRef`: the charge reference returned by the charge call

**Response** (200 OK)

```json
{
  "payment": { "id": "uuid", "status": "succeeded", "...": "..." },
  "applied": true
}
```

`applied` is `false` when the event was a duplicate and nothing changed.
Returns `404` when no payment matches `externalRef`.

## Health Check

### Check API Health

```http
GET /health
```

**Response**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-10T10:00:00.000Z",
  "database": "connected"
}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "guestEmail",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Authentication token is missing"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "This resource belongs to another restaurant"
}
```

### 404 Not Found

```json
{
  "error": "Not found",
  "message": "Reservation with id abc-123 not found"
}
```

### 409 Conflict

```json
{
  "error": "Conflict",
  "message": "Table number 2 already exists"
}
```

### 422 Unprocessable Entity

```json
{
  "error": "Business rule violation",
  "message": "Cannot confirm a cancelled reservation"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Status Codes

- `200 OK` - Successful GET/PATCH request
- `201 Created` - Successful POST request creating a resource
- `204 No Content` - Successful DELETE request
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Authenticated but not allowed (e.g. cross-tenant access)
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource (slug, table number)
- `422 Unprocessable Entity` - Business rule violation
- `500 Internal Server Error` - Server error

## Validation Rules

### Reservation

- `guestName`: required, max 100 characters
- `guestEmail`: required, valid email format
- `guestPhone`: optional, max 20 characters
- `date`: required, ISO datetime format
- `time`: required, HH:MM format
- `partySize`: required, integer between 1-50
- `notes`: optional, max 500 characters

### Table

- `tableNumber`: required, integer >= 1, unique per restaurant
- `capacity`: required, integer between 1-20
- `location`: optional, max 50 characters

### Restaurant

- `name`: required, max 100 characters
- `slug`: required, lowercase letters/numbers/hyphens, max 50 characters, globally unique, immutable
- `timezone`: optional (defaults to `UTC`), non-empty
- `currency`: optional (defaults to `USD`), 3-letter ISO 4217 code
- `address`: optional, max 200 characters
- `phone`: optional, max 30 characters

### Menu Item

- `name`: required, max 100 characters, unique per restaurant
- `description`: optional, max 500 characters
- `category`: required, max 50 characters
- `priceCents`: required, non-negative integer (cents)
- `isAvailable`: optional boolean (defaults to `true`)

### Order

- `reservationId`: required
- `items`: required, 1-100 entries
- `items[].quantity`: required, integer between 1-100
- `items[].notes`: optional, max 255 characters
- `tipCents`: optional, non-negative integer (cents)
- `notes`: optional, max 500 characters

## Business Rules

1. Reservations can only be made during operating hours (11:00 AM - 10:00 PM)
2. Must have available tables with sufficient capacity
3. Cannot have conflicting time slots
4. Cancelled reservations cannot be confirmed
5. Completed reservations cannot be cancelled
6. Only confirmed reservations can be completed
7. Orders can only be placed against a live reservation (pending, confirmed or seated)
8. Order items snapshot the menu item's name and price at order time
9. Line totals, subtotal and total are always integer cents (total = subtotal + tax + tip)
10. Unavailable menu items cannot be ordered; items referenced by orders cannot be deleted
11. Bill splits are exact: the integer-cent shares always sum back to the order total, with the remainder cents assigned deterministically to the first shares
