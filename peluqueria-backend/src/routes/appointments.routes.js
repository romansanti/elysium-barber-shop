const express = require('express');
const router = express.Router();
const {
  getAppointments,
  createAppointment,
  getAvailability,
  cancelAppointmentByCode,
  updateAppointmentStatus
} = require('../controllers/appointments.controller');

router.get('/availability', getAvailability);
router.get('/', getAppointments);
router.post('/', createAppointment);
router.patch('/cancel/:code', cancelAppointmentByCode);
router.patch('/:id/status', updateAppointmentStatus);

module.exports = router;