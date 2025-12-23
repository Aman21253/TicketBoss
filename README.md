# 🎟️ TicketBoss

**TicketBoss** is a high-performance, concurrent event-ticketing API built with **Node.js** and **SQLite**.

It implements **Optimistic Concurrency Control (OCC)** to verify real-time availability in high-traffic scenarios (e.g., ticket drops), guaranteeing **zero over-selling** with strict data integrity.

---

## 🚀 Quick Start

### 1. Install & Run
```bash
# Install dependencies
npm install

# Start the server (Port 3000)
npm start
```

### 2. Run Verification Tests
To prove thread-safety, we include a concurrency stress test:
```bash
npm test
```
*Simulates 60 concurrent requests fighting for the same seats.*

---

## 🛡️ Robustness & Quality
This project goes beyond the basics to ensure "Production-Grade" stability:

*   **Strict Validation (`zod`)**: Request bodies are validated against strict schemas. Invalid types (e.g., passing a string for `seats`) are caught immediately with clean `400` errors.
*   **Database Integrity**: SQLite is configured with `PRAGMA foreign_keys = ON` to enforce referential integrity between Reservations and Events.
*   **Optmistic Concurrency**: Uses an atomic versioning strategy (`version` column) to handle race conditions without expensive table locks.
*   **Graceful Shutdown**: Handles `SIGINT` signals to close the database connection properly, preventing data corruption.

---

## 📖 API Documentation

### 1. Event Summary
**Endpoint:** `GET /reservations/` (Root supported via `/`)
Returns the current state of the event.

**Response `200 OK`**:
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

### 2. Reserve Seats
**Endpoint:** `POST /reservations/`
Reserves 1-10 seats for a partner.

**Request**:
```json
{
  "partnerId": "abc-corp",
  "seats": 3
}
```

**Responses**:
*   `201 Created`: Success.
*   `400 Bad Request`: Invalid input (e.g., seats > 10).
*   `409 Conflict`: Not enough seats or concurrency conflict (try again).

### 3. Cancel Reservation
**Endpoint:** `DELETE /reservations/:reservationId`
Cancels a reservation and returns seats to the pool.

**Responses**:
*   `204 No Content`: Success.
*   `404 Not Found`: Reservation ID does not exist.

---

## ⚡ Manual Testing (Curl)

**Reserve Seats**:
```bash
curl -X POST http://localhost:3000/reservations \
  -H "Content-Type: application/json" \
  -d '{"partnerId": "manual-test", "seats": 5}'
```

**Check Status**:
```bash
curl http://localhost:3000/reservations
```

---

## 🛠 Project Structure
```text
.
├── src/
│   ├── app.js          # Express setup & Middleware
│   ├── server.js       # Entry point
│   ├── routes.js       # API Routes
│   ├── controller.js   # Logic & Validation (Zod)
│   ├── service.js      # Business Logic & Transactions
│   └── db.js           # SQLite Initialization
├── test/
│   └── verify.js       # Concurrency Stress Test
├── package.json
└── README.md
```

## 🏗 Architecture Decisions

### Storage: SQLite (`better-sqlite3`)
We used `better-sqlite3` for its synchronous nature, which simplifies logic while outperforming asynchronous drivers for this specific use-case.
*   **WAL Mode**: Enabled for higher concurrency.
*   **Atomic Transactions**: All seat updates happen inside `db.transaction()` to ensure all-or-nothing execution.

### Concurrency Strategy
We do **not** use JavaScript locks (which fail across multiple processes). Instead, we use SQL-level Optimistic Locking:
```sql
UPDATE events SET availableSeats = availableSeats - ?, version = version + 1
WHERE id = ? AND version = ?
```
If `changes == 0`, the version mismatch indicates a race condition, and we reject the request immediately.


<!-- URL -->
GET http://localhost:3000/reservations

Response:
```json
{
	"eventId": "node-meetup-2025",
	"name": "Node.js Meet-up",
	"totalSeats": 500,
	"availableSeats": 466,
	"reservationCount": 9,
	"version": 13
}
```

POST http://localhost:3000/reservations

Request:
```json
{
	"partnerId": "manual-test",
	"seats": 3
}
```

Response:
```json
{
	"reservationId": "f2ce2929-fefa-4d74-8b55-86de0c106bb5",
	"seats": 3,
	"status": "confirmed"
}
```

DELETE http://localhost:3000/reservations/{reservationId}