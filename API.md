# Reservely API Documentation

Base URL: `http://localhost:3000/api`

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

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Reservation with id abc-123 not found"
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

- `200 OK` - Successful GET request
- `201 Created` - Successful POST request creating a resource
- `400 Bad Request` - Validation error
- `404 Not Found` - Resource not found
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
- `tableNumber`: required, integer >= 1, unique
- `capacity`: required, integer between 1-20
- `location`: optional, max 50 characters

## Business Rules

1. Reservations can only be made during operating hours (11:00 AM - 10:00 PM)
2. Must have available tables with sufficient capacity
3. Cannot have conflicting time slots
4. Cancelled reservations cannot be confirmed
5. Completed reservations cannot be cancelled
6. Only confirmed reservations can be completed
