const express = require('express');
const router = express.Router();
const {
  createOrUpdateProfile,
  getMyProfile,
  getDonorEligibility,
  searchDonors,
  toggleAvailability,
  getEligibleRequests,
  respondToRequest,
  getMyResponses
} = require('../controllers/donorController');
const { protect } = require('../middleware/authMiddleware');

router.post('/profile', protect, createOrUpdateProfile);
router.get('/me', protect, getMyProfile);
router.get('/me/eligibility', protect, getDonorEligibility);
router.get('/my-responses', protect, getMyResponses);
router.get('/search', protect, searchDonors);
router.put('/availability', protect, toggleAvailability);
router.get('/eligible-requests', protect, getEligibleRequests);
router.post('/respond', protect, respondToRequest);

module.exports = router;


