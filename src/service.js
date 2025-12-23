const db = require('./db');
const { v4: uuidv4 } = require('uuid');

class TicketService {
    constructor() {
        this.eventId = 'node-meetup-2025'; // As per problem statement, we have one main event
    }

    // Returns { success: boolean, reservationId?: string, error?: string, type?: 'CONFLICT' | 'BAD_REQUEST' }
    reserveSeats(partnerId, seats) {
        if (seats <= 0 || seats > 10) {
            return { success: false, error: 'Invalid number of seats (1-10 allowed)', type: 'BAD_REQUEST' };
        }

        // Define the transaction
        const makeReservationTx = db.transaction(() => {
            // 1. Read current state
            const event = db.prepare('SELECT availableSeats, version FROM events WHERE id = ?').get(this.eventId);

            if (!event) {
                throw new Error('Event not initialized'); // Should not happen due to bootstrap
            }

            if (event.availableSeats < seats) {
                // Known failure before trying update
                return { success: false, error: 'Not enough seats left', type: 'CONFLICT' };
            }

            // 2. Attempt Optimistic Update
            const result = db.prepare(`
        UPDATE events
        SET availableSeats = availableSeats - ?,
            version = version + 1
        WHERE id = ?
          AND version = ?
          AND availableSeats >= ?
      `).run(seats, this.eventId, event.version, seats);

            if (result.changes === 0) {
                // This means either:
                // a) Version changed (someone else modified the record)
                // b) availableSeats dropped below 'seats' in the split second between read and write (though clause 'availableSeats >= ?' handles that safety too)
                return { success: false, error: 'Concurrency conflict or seats taken', type: 'CONFLICT' };
            }

            // 3. Create Reservation Record
            const reservationId = uuidv4();
            db.prepare(`
        INSERT INTO reservations (id, eventId, partnerId, seats, status)
        VALUES (?, ?, ?, ?, 'confirmed')
      `).run(reservationId, this.eventId, partnerId, seats);

            return { success: true, reservationId };
        });

        try {
            return makeReservationTx();
        } catch (err) {
            console.error('Reservation Transaction Error:', err);
            // If the transaction function returns a value, it works. If it throws, we catch here.
            // But the returns inside the tx logic above are returned by tx().
            return { success: false, error: 'Internal Server Error', type: 'INTERNAL' };
        }
    }

    cancelReservation(reservationId) {
        // Transaction for cancellation
        const cancelTx = db.transaction(() => {
            const reservation = db.prepare("SELECT * FROM reservations WHERE id = ? AND status = 'confirmed'").get(reservationId);

            if (!reservation) {
                return { success: false, type: 'NOT_FOUND' };
            }

            // Return seats to pool
            // We also increment version here to maintain consistency of the 'event' aggregate root, 
            // though strictly strictly speaking it's an additive change so maybe less contention, 
            // but let's be safe and bump version.
            db.prepare(`
            UPDATE events
            SET availableSeats = availableSeats + ?,
                version = version + 1
            WHERE id = ?
        `).run(reservation.seats, reservation.eventId);

            // Mark reservation as cancelled or delete it? 
            // Requirement says: "404 Not Found if reservationId unknown or already cancelled".
            // So we should probably soft delete or mark status so we can track it, 
            // BUT strictly 404 implies we don't find it "active".
            // Let's DELETE it as per "responses: ... (seats go back to pool) ... 404 ... status unknown"
            // The prompt endpoint is DELETE /reservations/:id. 
            // Usually safe to just delete row if we don't need history, or move to a history table.
            // I will update status to 'cancelled' so I can check 'already cancelled' logic if needed, 
            // or just rely on row absence.
            // Prompt says "reservationId unknown OR already cancelled". This implies we might keep record.
            // Let's just DELETE for simplicity unless history is demanded. 
            // Wait, "already cancelled" implies we know it WAS cancelled.
            // I'll update status to 'cancelled'.

            db.prepare(`
            UPDATE reservations 
            SET status = 'cancelled' 
            WHERE id = ?
        `).run(reservationId);

            return { success: true };
        });

        return cancelTx();
    }

    getEventSummary() {
        const event = db.prepare('SELECT * FROM events WHERE id = ?').get(this.eventId);
        const result = db.prepare("SELECT count(*) as count FROM reservations WHERE eventId = ? AND status = 'confirmed'").get(this.eventId);

        return {
            eventId: event.id,
            name: event.name,
            totalSeats: event.totalSeats,
            availableSeats: event.availableSeats,
            reservationCount: result.count,
            version: event.version
        };
    }
}

module.exports = new TicketService();
