const db = require('./db');
const { v4: uuidv4 } = require('uuid');

/**
 * Service Layer for TicketBoss
 * Handles business logic and database interactions.
 * 
 * Technical Design:
 * - Uses Synchronous SQLite (better-sqlite3) for simplicity and speed.
 * - Implements Optimistic Concurrency Control (OCC) using a version column.
 */
class TicketService {
    constructor() {
        this.eventId = 'node-meetup-2025'; // Single event as per problem statement
    }

    // Returns { success: boolean, reservationId?: string, error?: string, type?: 'CONFLICT' | 'BAD_REQUEST' }
    reserveSeats(partnerId, seats) {
        // Basic validation for seats
        if (typeof seats !== 'number' || seats <= 0 || seats > 10) {
            return { success: false, error: 'Invalid number of seats (1-10 allowed)', type: 'BAD_REQUEST' };
        }

        // Use a transaction to ensure atomicity of the check and update.
        const makeReservationTx = db.transaction(() => {
            // Read current state (including version)
            const event = db.prepare('SELECT availableSeats, version FROM events WHERE id = ?').get(this.eventId);

            if (!event) {
                throw new Error('Event not initialized');
            }

            // Fail fast if obviously not enough seats
            if (event.availableSeats < seats) {
                return { success: false, error: 'Not enough seats left', type: 'CONFLICT' };
            }

            // Attempt Optimistic Update
            // "availableSeats >= ?" safety check acts as a secondary guard
            const result = db.prepare(`
        UPDATE events
        SET availableSeats = availableSeats - ?,
            version = version + 1
        WHERE id = ?
          AND version = ?
          AND availableSeats >= ?
      `).run(seats, this.eventId, event.version, seats);

            // If changes === 0, it means the version changed since our read (concurrency conflict)
            // or seats were taken. We deny the request.
            if (result.changes === 0) {
                return { success: false, error: 'Concurrency conflict or seats taken', type: 'CONFLICT' };
            }

            // Create Reservation Record
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
            console.error('Transaction Failed:', err);
            throw err; // Let controller handle 500
        }
    }

    cancelReservation(reservationId) {
        const cancelTx = db.transaction(() => {
            // Check if reservation exists and is confirmed
            const reservation = db.prepare("SELECT * FROM reservations WHERE id = ? AND status = 'confirmed'").get(reservationId);

            if (!reservation) {
                return { success: false, type: 'NOT_FOUND' };
            }

            // Return seats to pool & Increment Version
            db.prepare(`
            UPDATE events
            SET availableSeats = availableSeats + ?,
                version = version + 1
            WHERE id = ?
        `).run(reservation.seats, reservation.eventId);

            // Update status to explicitly Cancelled
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
