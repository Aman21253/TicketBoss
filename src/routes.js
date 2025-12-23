const express = require('express');
const router = express.Router();
const controller = require('./controller');

// Root route for convenience
router.get('/', (req, res) => {
    res.send({ message: 'Welcome to TicketBoss API', documentation: 'See POST/GET /reservations' });
});

router.post('/reservations', controller.reserveSeats);
router.delete('/reservations/:reservationId', controller.cancelReservation);
router.get('/reservations', controller.getEventSummary);

module.exports = router;
