const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.post('/reservations', controller.reserveSeats);
router.delete('/reservations/:reservationId', controller.cancelReservation);
router.get('/reservations', controller.getEventSummary);

module.exports = router;
