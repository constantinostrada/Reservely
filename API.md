# Reservely API Documentation

Base URL: `http://localhost:3000/api`

> All endpoints except `POST /restaurants`, `POST /auth/login` and `GET /health`
> require authentication: a `Bearer` token in the `Authorization` header or the
> `auth_token` httpOnly cookie (set by login). Every request is scoped to the
> restaurant in the token.

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
  "phone": "+1234567890"
}
```

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

Partial update of `name`, `timezone`, `currency`, `address`, `phone`.
The `slug` is immutable.

### Delete Restaurant
```http
DELETE /restaurants/:id
```

Owner role only (`403` otherwise). Cascades to everything the restaurant
owns. **Response**: `204 No Content`.

## Reservations

### List All Reservations
```http
GET /reservations
```

**Response**
```json
{
  "reservations": [
    {
      "id": "uuid",
      "guestName": "John Doe",
      "guestEmail": "john@example.com",
      "guestPhone": "+1234567890",
      "date": "2024-01-15T00:00:00.000Z",
      "time": "18:30",
      "partySize": 4,
      "status": "pending",
      "notes": "Window seat preferred",
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-10T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

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
  "date": "2024-01-15T00:00:00.000Z",
  "time": "18:30",
  "partySize": 4,
  "notes": "Window seat preferred"
}
```

**Response** (201 Created)
```json
{
  "id": "uuid",
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890",
  "date": "2024-01-15T00:00:00.000Z",
  "time": "18:30",
  "partySize": 4,
  "status": "pending",
  "notes": "Window seat preferred",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T10:00:00.000Z"
}
```

### Get Reservation by ID
```http
GET /reservations/:id
```

**Response**
```json
{
  "id": "uuid",
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890",
  "date": "2024-01-15T00:00:00.000Z",
  "time": "18:30",
  "partySize": 4,
  "status": "pending",
  "notes": "Window seat preferred",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T10:00:00.000Z"
}
```

### Confirm Reservation
```http
POST /reservations/:id/confirm
```

**Response**
```json
{
  "id": "uuid",
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890",
  "date": "2024-01-15T00:00:00.000Z",
  "time": "18:30",
  "partySize": 4,
  "status": "confirmed",
  "notes": "Window seat preferred",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T11:00:00.000Z"
}
```

### Cancel Reservation
```http
POST /reservations/:id/cancel
```

**Response**
```json
{
  "id": "uuid",
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890",
  "date": "2024-01-15T00:00:00.000Z",
  "time": "18:30",
  "partySize": 4,
  "status": "cancelled",
  "notes": "Window seat preferred",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T12:00:00.000Z"
}
```

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

## Business Rules

1. Reservations can only be made during operating hours (11:00 AM - 10:00 PM)
2. Must have available tables with sufficient capacity
3. Cannot have conflicting time slots
4. Cancelled reservations cannot be confirmed
5. Completed reservations cannot be cancelled
6. Only confirmed reservations can be completed
