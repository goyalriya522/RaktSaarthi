const aiService = require('../services/aiService');
const BloodRequest = require('../models/BloodRequest');
const BloodInventory = require('../models/BloodInventory');
const Donor = require('../models/Donor');
const ThalassemiaProfile = require('../models/ThalassemiaProfile');

// @desc Process Multilingual AI Assistant Chat
// @route POST /api/ai/chat
const chatHandler = async (req, res) => {
  try {
    const { query, language = 'en' } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a non-empty query string'
      });
    }

    if (query.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Query exceeds maximum allowed length of 500 characters'
      });
    }

    // Build context data from live DB if available
    const contextData = {
      user: req.user || null,
      userRequests: [],
      inventories: [],
      donorProfile: null,
      thalassemiaProfiles: []
    };

    if (req.user) {
      contextData.userRequests = await BloodRequest.find({ patientId: req.user._id }).sort({ createdAt: -1 }).limit(5);
      contextData.donorProfile = await Donor.findOne({ userId: req.user._id });
      contextData.thalassemiaProfiles = await ThalassemiaProfile.find({ userId: req.user._id });
    }

    // Fetch stock inventory for availability questions
    contextData.inventories = await BloodInventory.find().limit(20);

    const result = await aiService.processMultilingualChat({
      query: query.trim(),
      language: language.toLowerCase(),
      contextData
    });

    res.json(result);
  } catch (error) {
    console.error('AI Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'RaktSaarthi AI Assistant encountered a temporary error. Please try again.'
    });
  }
};

module.exports = { chatHandler };
