const express = require('express');
const router = express.Router();
const {
  createRequest,
  getRequests,
  getRequestById,
  verifyRequest,
  reserveBloodBank,
  fulfillRequest,
  updateStatus,
  notifyDonors
} = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createRequest)
  .get(protect, getRequests);

router.get('/:id', protect, getRequestById);
router.post('/:id/notify-donors', protect, notifyDonors);
router.put('/:id/verify', protect, authorize('hospital', 'admin'), verifyRequest);
router.put('/:id/reserve', protect, authorize('bloodbank', 'admin'), reserveBloodBank);
router.put('/:id/fulfill', protect, authorize('hospital', 'bloodbank', 'admin'), fulfillRequest);
router.put('/:id/status', protect, updateStatus);

module.exports = router;
