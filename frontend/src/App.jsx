import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [eventData, setEventData] = useState(null);
  const [seats, setSeats] = useState(1);
  const [partnerId, setPartnerId] = useState(`Partner-${Math.floor(Math.random() * 1000)}`);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://localhost:3000';

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/reservations`);
      const data = await res.json();
      setEventData(data);
    } catch (err) {
      console.error("Failed to fetch event data", err);
    }
  };

  // Poll every 2 seconds
  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleReserve = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`${API_URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId, seats: parseInt(seats) })
      });

      const data = await res.json();

      if (res.status === 201) {
        setStatus({ type: 'success', message: `Successfully reserved ${data.seats} seats! ID: ${data.reservationId.slice(0, 8)}...` });
        fetchSummary(); // Immediate update
      } else {
        setStatus({ type: 'error', message: data.error || 'Reservation failed' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network Error' });
    } finally {
      setLoading(false);
    }
  };

  if (!eventData) return <div className="loading">Loading System...</div>;

  const isSoldOut = eventData.availableSeats === 0;

  return (
    <div className="dashboard">
      <div className="header">
        <h1>TicketBoss</h1>
        <div className="event-name">{eventData.name}</div>
      </div>

      <div className="counter-box">
        <div className={`counter-value ${isSoldOut ? 'sold-out' : ''}`}>
          {eventData.availableSeats}
        </div>
        <div className="counter-label">Seats Available</div>
      </div>

      {!isSoldOut && (
        <form className="reservation-form" onSubmit={handleReserve}>
          <input
            type="text"
            placeholder="Partner ID"
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            required
          />
          <input
            type="number"
            min="1"
            max="10"
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Reserve Seats'}
          </button>
        </form>
      )}

      {isSoldOut && (
        <div className="status-msg error">
          EVENT SOLD OUT
        </div>
      )}

      {status && (
        <div className={`status-msg ${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}

export default App;
