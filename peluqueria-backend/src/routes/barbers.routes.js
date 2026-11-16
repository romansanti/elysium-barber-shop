const express = require('express');
const router = express.Router();
const { getBarbers } = require('../controllers/barbers.controller');

// Ruta: GET /api/v1/barbers
router.get('/', getBarbers);

module.exports = router;