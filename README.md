# TicketBoss

A concurrent seat reservation system for high-demand events, built with Node.js.

## Setup Instructions

### Prerequisites
- Node.js (v18+ recommended)
- NPM

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application
To start the server:
```bash
npm start
```
The API will be available at `http://localhost:3000` (default port).

### Running Tests
To run the automated test suite:
```bash
npm test
```

## API Documentation

### 1. Reserve Seats
Book seats for a specific partner.

- **Endpoint**: `POST /reservations`
- **Request Body**:
  ```json
  {
    "partnerId": "string (required, non-empty)",
    "seats": "number (required, 1-10)"
  }
  ```
- **Responses**:
  - `201 Created`: Reservation successful
    ```json
    {
      "reservationId": "uuid-string",
      "seats": 5,
      "status": "confirmed"
    }
    ```
  - `400 Bad Request`: Validation error or invalid input
    ```json
    { "error": "seats must be between 1 and 10" }
    ```
  - `409 Conflict`: Not enough seats available or concurrency conflict
    ```json
    { "error": "Not enough seats left" }
    ```

### 2. Cancel Reservation
Release seats back to the pool.

- **Endpoint**: `DELETE /reservations/:reservationId`
- **Responses**:
  - `204 No Content`: Successful cancellation
  - `404 Not Found`: Reservation ID does not exist or was arguably cancelled
    ```json
    { "error": "Reservation not found or already cancelled" }
    ```

### 3. Event Summary
Get current availability and event status.

- **Endpoint**: `GET /reservations`
- **Responses**:
  - `200 OK`:
    ```json
    {
      "eventId": "node-meetup-2025",
      "name": "Node.js Meet-up",
      "totalSeats": 500,
      "availableSeats": 450,
      "reservationCount": 10,
      "version": 15
    }
    ```

## Technical Decisions

### Architecture
- **Layered Structure**: The codebase uses a clean separation of concerns:
  - **Controller (`src/controller.js`)**: Handles HTTP requests, validation (using `zod`), and response formatting.
  - **Service (`src/service.js`)**: Contains all business logic and transaction management.
  - **Database (`src/db.js`)**: Manages the SQLite connection and schema initialization.

### Storage Method (SQLite)
- **Library**: `better-sqlite3` was chosen for its performance (synchronous bindings) and simplicity for a local file-based database.
- **WAL Mode**: Write-Ahead Logging is enabled (`db.pragma('journal_mode = WAL')`) to improve concurrency and performance by allowing simultaneous readers and writers.

### Concurrency & Consistency
- **Optimistic Concurrency Control (OCC)**: To handle high-concurrency race conditions (e.g., "The Ticketmaster Problem"), the `events` table includes a `version` column.
  - When reserving seats, the code assumes the row hasn't changed since it was read.
  - The `UPDATE` query enforces `version = readVersion`.
  - If `changes === 0`, it indicates a race condition occurred, and the request is rejected immediately (Fail Fast strategy).
- **Transactions**: All operations (reservations and cancellations) are wrapped in SQLite transactions to ensure atomicity.

### Assumptions
- The system currently supports a single event hardcoded as `node-meetup-2025`.
- A maximum of 10 seats per reservation request is enforced to prevent bulk hoarding.
