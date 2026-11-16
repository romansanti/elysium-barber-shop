const express = require('express');
const router = express.Router();
const { getServices, createService, updateService } = require('../controllers/services.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', getServices);
router.post('/', verifyToken, createService);
router.patch('/:id', verifyToken, updateService);

module.exports = router;