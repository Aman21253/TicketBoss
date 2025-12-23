# TicketBoss Frontend

This is the React-based user interface for the TicketBoss API. It provides a real-time dashboard for viewing seat availability and making reservations.

## Technology Stack
-   **React 18**: Core UI library.
-   **Vite**: Next-generation build tool for fast development.
-   **Vanilla CSS**: Custom styling with CSS Variables for a premium, lightweight aesthetic.

## Architecture

### 1. Communication with Backend
-   **API Endpoint**: The frontend connects to `http://localhost:3000`.
-   **CORS**: The backend was configured to allow specific cross-origin requests from this frontend (running on port 5173).

### 2. Real-Time Data (Polling)
-   Since the backend is a simple REST API (not WebSockets), the frontend uses **Short Polling**.
-   **Mechanism**: A `setInterval` runs every **2 seconds** to fetch `GET /reservations/`.
-   **Benefit**: Keeps the "Seats Available" counter nearly live without complex socket infrastructure.

### 3. State Management
-   `eventData`: Stores the full event object (name, total seats, available seats).
-   `status`: Handles UI feedback (success green toasts, error red toasts).
-   `loading`: Disables the button during the network request to prevent double-submissions.

## Project Structure
```
frontend/
├── index.html       # HTML entry point
├── src/
│   ├── main.jsx     # React root mounting
│   ├── App.jsx      # Main application logic & layout
│   └── App.css      # Global styles & refined UI components
└── package.json     # Dependencies
```

## Running the Frontend
```bash
npm install
npm run dev
```
Open `http://localhost:5173`.
