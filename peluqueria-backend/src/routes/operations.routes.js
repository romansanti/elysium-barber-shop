const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const {
  getCashMovements,
  createCashMovement,
  deleteCashMovement,
  getPendingSettlement,
  createSettlement,
  getSecurityPins,
  updateSecurityPin,
  getAnalytics,
} = require('../controllers/operations.controller');

router.get('/cash-movements', verifyToken, getCashMovements);
router.post('/cash-movements', verifyToken, createCashMovement);
router.delete('/cash-movements/:id', verifyToken, deleteCashMovement);
router.get('/settlements/pending/:barberId', verifyToken, getPendingSettlement);
router.post('/settlements', verifyToken, createSettlement);
router.get('/security-pins', verifyToken, getSecurityPins);
router.patch('/security-pins/:actionKey', verifyToken, updateSecurityPin);
router.get('/analytics', verifyToken, getAnalytics);

module.exports = router;
