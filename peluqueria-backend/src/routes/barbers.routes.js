const express = require('express');
const router = express.Router();
const { getBarbers, updateBarber, createBarber, deactivateBarber } = require('../controllers/barbers.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Ruta: GET /api/v1/barbers
router.get('/', getBarbers);

// Ruta protegida: POST /api/v1/barbers
router.post('/', verifyToken, createBarber);

// Ruta protegida: PATCH /api/v1/barbers/:id
router.patch('/:id', verifyToken, updateBarber);

// Ruta protegida: DELETE /api/v1/barbers/:id
router.delete('/:id', verifyToken, deactivateBarber);

module.exports = router;