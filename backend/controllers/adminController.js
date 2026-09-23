const User = require('../models/User');
const Hospital = require('../models/Hospital');
const BloodBank = require('../models/BloodBank');
const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const BloodInventory = require('../models/BloodInventory');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const SystemSettings = require('../models/SystemSettings');
const aiService = require('../services/aiService');
const { broadcastGlobal, emitToRole } = require('../sockets/socketHandler');
const logAuditAction = require('../utils/auditLogger');

// @desc Get complete executive dashboard analytics
// @route GET /api/admin/stats
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeDonors = await Donor.countDocuments({ isAvailable: true });
    const registeredHospitals = await Hospital.countDocuments();
    const registeredBloodBanks = await BloodBank.countDocuments();

    const totalRequests = await BloodRequest.countDocuments();
    const pendingRequests = await BloodRequest.countDocuments({ status: { $in: ['Submitted', 'Under Verification', 'Verified', 'Searching'] } });
    const fulfilledRequests = await BloodRequest.countDocuments({ status: 'Fulfilled' });
    const urgentRequests = await BloodRequest.countDocuments({ emergencyLevel: 'CRITICAL' });

    // Calculate Average Fulfilment Time
    const fulfilledDocs = await BloodRequest.find({ status: 'Fulfilled', fulfilledAt: { $exists: true } });
    let totalHours = 0;
    fulfilledDocs.forEach(doc => {
      const hours = (new Date(doc.fulfilledAt).getTime() - new Date(doc.createdAt).getTime()) / (1000 * 60 * 60);
      totalHours += hours;
    });
    const avgFulfilmentHours = fulfilledDocs.length > 0 ? (totalHours / fulfilledDocs.length).toFixed(1) : '2.4';

    // Blood Group Demand breakdown
    const demandForecast = await aiService.predictDemand();

    // Available Inventory Summary
    const inventories = await BloodInventory.aggregate([
      {
        $group: {
          _id: '$bloodGroup',
          totalAvailable: { $sum: '$availableUnits' },
          totalReserved: { $sum: '$reservedUnits' }
        }
      }
    ]);

    const inventoryMap = {};
    inventories.forEach(item => {
      inventoryMap[item._id] = item.totalAvailable;
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeDonors,
        registeredHospitals,
        registeredBloodBanks,
        totalRequests,
        pendingRequests,
        fulfilledRequests,
        urgentRequests,
        avgFulfilmentHours,
        fulfilmentRate: totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 100) : 100
      },
      demandForecast,
      inventoryMap
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all users with filtering
// @route GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Toggle active status of a user
// @route PUT /api/admin/users/:id/toggle-status
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    logAuditAction({
      userId: req.user._id,
      userName: req.user.name,
      userRole: 'admin',
      action: 'TOGGLE_USER_STATUS',
      resource: 'User',
      resourceId: user._id.toString(),
      details: { email: user.email, isActive: user.isActive }
    });

    res.json({ success: true, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all registered hospital & blood bank entities
// @route GET /api/admin/entities
const getEntities = async (req, res) => {
  try {
    const hospitals = await Hospital.find().populate('userId', 'name email phone isVerified role createdAt');
    const bloodBanks = await BloodBank.find().populate('userId', 'name email phone isVerified role createdAt');

    res.json({
      success: true,
      hospitals,
      bloodBanks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Verify Hospital or Blood Bank entity
// @route PUT /api/admin/verify-entity
const verifyEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.body; // entityType: 'hospital' | 'bloodbank'

    if (entityType === 'hospital') {
      const hospital = await Hospital.findById(entityId);
      if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
      hospital.isVerified = true;
      await hospital.save();

      await User.findByIdAndUpdate(hospital.userId, { isVerified: true });

      logAuditAction({
        userId: req.user._id,
        userName: req.user.name,
        userRole: 'admin',
        action: 'VERIFY_HOSPITAL',
        resource: 'Hospital',
        resourceId: hospital._id.toString(),
        details: { hospitalName: hospital.hospitalName }
      });

      return res.json({ success: true, entity: hospital });
    } else {
      const bloodbank = await BloodBank.findById(entityId);
      if (!bloodbank) return res.status(404).json({ success: false, message: 'Blood bank not found' });
      bloodbank.isVerified = true;
      await bloodbank.save();

      await User.findByIdAndUpdate(bloodbank.userId, { isVerified: true });

      logAuditAction({
        userId: req.user._id,
        userName: req.user.name,
        userRole: 'admin',
        action: 'VERIFY_BLOOD_BANK',
        resource: 'BloodBank',
        resourceId: bloodbank._id.toString(),
        details: { bloodBankName: bloodbank.name }
      });

      return res.json({ success: true, entity: bloodbank });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get audit logs
// @route GET /api/admin/audit-logs
const getAuditLogs = async (req, res) => {
  try {
    const { action, search } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { resource: { $regex: search, $options: 'i' } }
      ];
    }

    const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(100);

    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Broadcast real-time platform notification
// @route POST /api/admin/broadcast
const broadcastNotification = async (req, res) => {
  try {
    const { title, message, recipientRole } = req.body;

    const notification = await Notification.create({
      recipientRole: recipientRole || 'all',
      title,
      message,
      type: 'SYSTEM_ADMIN',
      link: '/'
    });

    if (recipientRole && recipientRole !== 'all') {
      emitToRole(recipientRole, 'system_notification', notification);
    } else {
      broadcastGlobal('system_notification', notification);
    }

    logAuditAction({
      userId: req.user._id,
      userName: req.user.name,
      userRole: 'admin',
      action: 'BROADCAST_NOTIFICATION',
      resource: 'Notification',
      details: { title, recipientRole }
    });

    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAdminStats,
  getUsers,
  getEntities,
  toggleUserStatus,
  verifyEntity,
  getAuditLogs,
  broadcastNotification
};
