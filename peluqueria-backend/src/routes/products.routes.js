const express = require('express');
const router = express.Router();
const { getProducts, createProduct, adjustStock, getStockMovements, updateProduct, deleteProduct } = require('../controllers/products.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', getProducts);
router.get('/movements', verifyToken, getStockMovements);
router.post('/', verifyToken, createProduct);
router.patch('/:id', verifyToken, updateProduct);
router.patch('/:id/stock', verifyToken, adjustStock);
router.delete('/:id', verifyToken, deleteProduct);

module.exports = router;