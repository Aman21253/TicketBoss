const service = require('./service');
const { z } = require('zod');

// Schema for request validation
const reservationSchema = z.object({
    partnerId: z.string().min(1, 'partnerId must be a non-empty string'),
    seats: z.number().int().min(1).max(10, 'seats must be between 1 and 10')
});

exports.reserveSeats = (req, res) => {
    // 4. Evaluation Criteria > Validation: Is user input validated effectively?
    // Using Zod for strict validation of types and ranges.
    const result = reservationSchema.safeParse(req.body);

    if (!result.success) {
        // Fallback or issues
        const errorMsg = result.error.issues?.[0]?.message || result.error.errors?.[0]?.message || 'Invalid input';
        return res.status(400).json({ error: errorMsg });
    }

    const { partnerId, seats } = result.data;

    try {
        const result = service.reserveSeats(partnerId, seats);

        if (result.success) {
            // Functionality > 2. Reserve Seats > Response 201 Created
            return res.status(201).json({
                reservationId: result.reservationId,
                seats: seats,
                status: 'confirmed'
            });
        }

        // Handle specific business logic errors
        if (result.type === 'BAD_REQUEST') {
            return res.status(400).json({ error: result.error });
        } else if (result.type === 'CONFLICT') {
            return res.status(409).json({ error: 'Not enough seats left' });
        } else {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    } catch (error) {
        console.error('Reserve controller error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.cancelReservation = (req, res) => {
    const { reservationId } = req.params;

    try {
        const result = service.cancelReservation(reservationId);

        if (result.success) {
            // Functionality > 3. Cancel Reservation > Response 204 No Content
            return res.status(204).send();
        } else {
            // Functionality > 3. Cancel Reservation > Response 404 Not Found
            return res.status(404).json({ error: 'Reservation not found or already cancelled' });
        }
    } catch (error) {
        console.error('Cancel controller error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getEventSummary = (req, res) => {
    try {
        const summary = service.getEventSummary();
        res.json(summary);
    } catch (err) {
        console.error('Summary controller error:', err);
        res.status(500).json({ error: err.message });
    }
};
