const express = require('express');
const router = express.Router();
const {
  createProfile,
  getMyProfiles,
  convertToBloodRequest
} = require('../controllers/thalassemiaController');
const { protect } = require('../middleware/authMiddleware');

router.post('/profile', protect, createProfile);
router.get('/my-profiles', protect, getMyProfiles);
router.post('/:id/convert-request', protect, convertToBloodRequest);

module.exports = router;
