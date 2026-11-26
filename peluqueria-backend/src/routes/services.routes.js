const express = require('express');
const router = express.Router();
const { getServices, createService, updateService, deleteService } = require('../controllers/services.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', getServices);
router.post('/', verifyToken, createService);
router.patch('/:id', verifyToken, updateService);
router.put('/:id', verifyToken, updateService);
router.delete('/:id', verifyToken, deleteService);

module.exports = router;