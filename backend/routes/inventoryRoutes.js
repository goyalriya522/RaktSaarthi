const express = require('express');
const router = express.Router();
const {
  getPublicAvailability,
  getMyBankInventory,
  createBloodUnit,
  updateBloodUnit,
  deleteBloodUnit,
  updateStock,
  getTransactions
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/availability', getPublicAvailability);
router.get('/my-bank', protect, authorize('bloodbank', 'admin'), getMyBankInventory);
router.post('/units', protect, authorize('bloodbank', 'admin'), createBloodUnit);
router.put('/units/:id', protect, authorize('bloodbank', 'admin'), updateBloodUnit);
router.delete('/units/:id', protect, authorize('bloodbank', 'admin'), deleteBloodUnit);
router.post('/update', protect, authorize('bloodbank', 'admin'), updateStock);
router.get('/transactions', protect, authorize('bloodbank', 'admin'), getTransactions);

module.exports = router;

