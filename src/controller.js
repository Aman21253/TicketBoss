const service = require('./service');

exports.reserveSeats = (req, res) => {
    const { partnerId, seats } = req.body;

    if (!partnerId || !seats) {
        return res.status(400).json({ error: 'Missing partnerId or seats' });
    }

    const result = service.reserveSeats(partnerId, seats);

    if (result.success) {
        return res.status(201).json({
            reservationId: result.reservationId,
            seats: seats,
            status: 'confirmed'
        });
    }

    // Handle errors
    if (result.type === 'BAD_REQUEST') {
        return res.status(400).json({ error: result.error }); // "if seats <= 0 or > 10"
    } else if (result.type === 'CONFLICT') {
        return res.status(409).json({ error: 'Not enough seats left' }); // Standardize message to prompt
    } else {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.cancelReservation = (req, res) => {
    const { reservationId } = req.params;

    const result = service.cancelReservation(reservationId);

    if (result.success) {
        return res.status(204).send();
    } else {
        // "404 Not Found if reservationId unknown or already cancelled"
        return res.status(404).json({ error: 'Reservation not found or already cancelled' });
    }
};

exports.getEventSummary = (req, res) => {
    try {
        const summary = service.getEventSummary();
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
