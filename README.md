# TicketBoss

A tiny event-ticketing API with optimistic concurrency control for real-time seat reservations.

## Setup Instructions

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run the Server**
    ```bash
    npm start
    ```
    The server will start on port 3000. Use `PORT` environment variable to change it.

3.  **Run Tests (Verification)**
    ```bash
    node test/verify.js
    ```

## API Documentation

### 1. Reserve Seats
**Endpoint:** `POST /reservations/`

**Request Body:**
```json
{
  "partnerId": "abc-corp",
  "seats": 3
}
```
*Note: `seats` must be between 1 and 10.*

**Responses:**
- `201 Created`: Reservation successful.
- `400 Bad Request`: Invalid validation (e.g. seats > 10).
- `409 Conflict`: Not enough seats left (or concurrency conflict).

### 2. Cancel Reservation
**Endpoint:** `DELETE /reservations/:reservationId`

**Responses:**
- `204 No Content`: Successful cancellation.
- `404 Not Found`: Reservation ID unknown or already cancelled.

### 3. Event Summary
**Endpoint:** `GET /reservations/`

**Response (`200 OK`):**
```json
{
  "eventId": "node-meetup-2025",
  "name": "Node.js Meet-up",
  "totalSeats": 500,
  "availableSeats": 42,
  "reservationCount": 458,
  "version": 14
}
```

## Technical Decisions

### Architecture
-   **Node.js & Express**: Standard, lightweight web server.
-   **Layered Design**: `Controller` (HTTP) -> `Service` (Business Logic) -> `DB` (Data Access).

### Storage & Concurrency
-   **SQLite (`better-sqlite3`)**: Chosen for zero-configuration persistence and fast synchronous execution.
-   **Optimistic Concurrency Control (OCC)**:
    -   The `events` table has a `version` column.
    -   Updates use a `WHERE version = ?` clause.
    -   If the version in the DB doesn't match the read version (due to a concurrent write), the update fails (returns 0 changes).
    -   This prevents over-selling without locking the entire database (though SQLite is single-writer by default, the logic explicitly handles the "check-then-act" race condition at the application/SQL boundary).

### Assumptions
-   The "Event Bootstrap" happens automatically on server start if the DB is empty.
-   Reservation IDs are UUIDs.
-   "Instant accept/deny" means we do not retry internally on conflict; we return 409 immediately.
