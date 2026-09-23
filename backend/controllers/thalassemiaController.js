const ThalassemiaProfile = require('../models/ThalassemiaProfile');
const BloodRequest = require('../models/BloodRequest');
const Notification = require('../models/Notification');
const aiService = require('../services/aiService');
const { emitToRole } = require('../sockets/socketHandler');

// @desc Create recurring transfusion profile
// @route POST /api/thalassemia/profile
const createProfile = async (req, res) => {
  try {
    const {
      patientName,
      age,
      gender,
      bloodGroup,
      hospitalName,
      transfusionIntervalDays,
      lastTransfusionDate,
      preferredBloodBank,
      contactPhone,
      notes
    } = req.body;

    const interval = parseInt(transfusionIntervalDays) || 21;
    const lastDate = new Date(lastTransfusionDate || Date.now());

    const reminderInfo = aiService.calculateThalassemiaReminder(lastDate, interval);

    const profile = await ThalassemiaProfile.create({
      userId: req.user._id,
      patientName: patientName || req.user.name,
      age: parseInt(age) || 25,
      gender: gender || 'Male',
      bloodGroup: bloodGroup || 'O+',
      hospitalName: hospitalName || 'General Hospital',
      transfusionIntervalDays: interval,
      lastTransfusionDate: lastDate,
      nextExpectedDate: reminderInfo.nextExpectedDate,
      preferredBloodBank: preferredBloodBank || '',
      contactPhone: contactPhone || req.user.phone,
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      profile,
      reminderInfo
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get user's Thalassemia profiles
// @route GET /api/thalassemia/my-profiles
const getMyProfiles = async (req, res) => {
  try {
    const profiles = await ThalassemiaProfile.find({ userId: req.user._id, isActive: true });

    const enriched = profiles.map(p => {
      const reminder = aiService.calculateThalassemiaReminder(p.lastTransfusionDate, p.transfusionIntervalDays);
      return {
        ...p.toObject(),
        reminder
      };
    });

    res.json({ success: true, count: enriched.length, profiles: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Convert scheduled Thalassemia date into active Blood Request
// @route POST /api/thalassemia/:id/convert-request
const convertToBloodRequest = async (req, res) => {
  try {
    const profile = await ThalassemiaProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    if (profile.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to convert this Thalassemia profile' });
    }

    const requestNumber = `BL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const aiAnalysis = aiService.predictEmergencyPriority({
      unitsRequired: 2,
      requiredByDate: profile.nextExpectedDate,
      reason: `Recurring Thalassemia Transfusion for ${profile.patientName}`,
      age: profile.age
    });

    const request = await BloodRequest.create({
      requestNumber,
      patientId: req.user._id,
      patientName: profile.patientName,
      age: profile.age,
      gender: profile.gender,
      bloodGroup: profile.bloodGroup,
      unitsRequired: 2,
      hospitalName: profile.hospitalName,
      hospitalAddress: 'Preferred Transfusion Hospital',
      emergencyLevel: 'URGENT',
      requiredByDate: profile.nextExpectedDate,
      contactPhone: profile.contactPhone,
      contactName: profile.patientName,
      reason: `Scheduled Thalassemia Transfusion (Interval: ${profile.transfusionIntervalDays} days)`,
      status: 'Submitted',
      statusHistory: [{
        status: 'Submitted',
        updatedBy: req.user._id,
        role: req.user.role,
        note: 'Auto-generated from Thalassemia Recurring Schedule',
        timestamp: new Date()
      }],
      aiAnalysis
    });

    await Notification.create({
      recipientRole: 'hospital',
      title: `Thalassemia Scheduled Request (${profile.bloodGroup})`,
      message: `Recurring transfusion request generated for ${profile.patientName}. Required by ${new Date(profile.nextExpectedDate).toLocaleDateString()}`,
      type: 'THALASSEMIA_REMINDER',
      link: `/requests/${request._id}`
    });

    emitToRole('hospital', 'new_blood_request', request);

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProfile,
  getMyProfiles,
  convertToBloodRequest
};
