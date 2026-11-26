const express = require('express');
const router = express.Router();
const { getBarbers, updateBarber } = require('../controllers/barbers.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Ruta: GET /api/v1/barbers
router.get('/', getBarbers);

// Ruta protegida: PATCH /api/v1/barbers/:id
router.patch('/:id', verifyToken, updateBarber);

module.exports = router;