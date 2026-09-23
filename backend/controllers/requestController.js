const BloodRequest = require('../models/BloodRequest');
const BloodMatch = require('../models/BloodMatch');
const Hospital = require('../models/Hospital');
const BloodBank = require('../models/BloodBank');
const BloodInventory = require('../models/BloodInventory');
const BloodUnit = require('../models/BloodUnit');
const InventoryTransaction = require('../models/InventoryTransaction');
const Notification = require('../models/Notification');
const aiService = require('../services/aiService');
const { autoSyncAndCheckExpiries } = require('./inventoryController');
const { emitRequestUpdate, emitToRole, emitToUser } = require('../sockets/socketHandler');
const logAuditAction = require('../utils/auditLogger');
const { notifyEligibleDonorsForRequest } = require('../utils/donorEligibility');


// @desc Create emergency blood request
// @route POST /api/requests
const createRequest = async (req, res) => {
  try {
    const {
      patientName,
      age,
      gender,
      bloodGroup,
      unitsRequired,
      hospitalName,
      hospitalAddress,
      coordinates,
      emergencyLevel,
      requiredByDate,
      contactPhone,
      contactName,
      reason,
      supportingDocs,
      clientRequestId
    } = req.body;

    // Idempotency check for offline sync re-submissions
    if (clientRequestId) {
      const existingReq = await BloodRequest.findOne({ clientRequestId });
      if (existingReq) {
        return res.status(200).json({
          success: true,
          request: existingReq,
          alreadyProcessed: true
        });
      }
    }

    const requestNumber = `BL-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // AI Priority Prediction
    const aiAnalysis = aiService.predictEmergencyPriority({
      unitsRequired,
      requiredByDate,
      reason,
      age
    });

    const newRequest = await BloodRequest.create({
      requestNumber,
      clientRequestId,
      patientId: req.user._id,
      patientName,
      age,
      gender,
      bloodGroup,
      unitsRequired: parseInt(unitsRequired) || 1,
      hospitalName,
      hospitalAddress: hospitalAddress || 'General Hospital Location',
      hospitalLocation: {
        type: 'Point',
        coordinates: coordinates || [77.2090, 28.6139]
      },
      emergencyLevel: emergencyLevel || aiAnalysis.emergencyLevel,
      requiredByDate: requiredByDate || new Date(Date.now() + 24 * 60 * 60 * 1000),
      contactPhone: contactPhone || req.user.phone,
      contactName: contactName || req.user.name,
      reason,
      supportingDocs: supportingDocs || [],
      status: req.user.role === 'hospital' ? 'Verified' : 'Submitted',
      statusHistory: [{
        status: req.user.role === 'hospital' ? 'Verified' : 'Submitted',
        updatedBy: req.user._id,
        role: req.user.role,
        note: 'Request initialized',
        timestamp: new Date()
      }],
      aiAnalysis
    });

    // Create Emergency Notifications for Blood Banks and Hospitals
    const priorityScore = newRequest.aiAnalysis?.priorityScore || 0;
    const isEmergency = newRequest.emergencyLevel === 'CRITICAL' || newRequest.emergencyLevel === 'URGENT' || priorityScore >= 70;

    if (isEmergency) {
      // Blood Bank Alert (Deduplicated)
      const existingBankNotif = await Notification.findOne({
        recipientRole: 'bloodbank',
        referenceRequestId: newRequest._id,
        type: 'EMERGENCY_ALERT'
      });

      if (!existingBankNotif) {
        await Notification.create({
          recipientRole: 'bloodbank',
          title: `🚨 Emergency Blood Request (${newRequest.bloodGroup})`,
          message: `🚨 Emergency Blood Request\n• Blood Group: ${newRequest.bloodGroup}\n• Units Required: ${newRequest.unitsRequired}\n• Priority: ${newRequest.emergencyLevel}\n• Hospital: ${newRequest.hospitalName}\n• Request Number: ${newRequest.requestNumber}\n• Required By: ${new Date(newRequest.requiredByDate).toLocaleString()}`,
          type: 'EMERGENCY_ALERT',
          referenceRequestId: newRequest._id,
          link: `/patient/requests/${newRequest._id}`
        });
      }

      // Hospital Alert (Deduplicated)
      const existingHospitalNotif = await Notification.findOne({
        recipientRole: 'hospital',
        referenceRequestId: newRequest._id,
        type: 'EMERGENCY_ALERT'
      });

      if (!existingHospitalNotif) {
        await Notification.create({
          recipientRole: 'hospital',
          title: `🚨 Emergency Blood Request (${newRequest.bloodGroup})`,
          message: `🚨 Emergency Blood Request\n• Blood Group: ${newRequest.bloodGroup}\n• Units Required: ${newRequest.unitsRequired}\n• Priority: ${newRequest.emergencyLevel}\n• Hospital: ${newRequest.hospitalName}\n• Request Number: ${newRequest.requestNumber}`,
          type: 'EMERGENCY_ALERT',
          referenceRequestId: newRequest._id,
          link: `/patient/requests/${newRequest._id}`
        });
      }
    }

    // Real-time socket alerts
    emitToRole('hospital', 'new_blood_request', newRequest);
    emitToRole('bloodbank', 'new_blood_request', newRequest);
    emitToRole('admin', 'new_blood_request', newRequest);

    // Notify eligible volunteer donors
    await notifyEligibleDonorsForRequest(newRequest);


    logAuditAction({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CREATE_BLOOD_REQUEST',
      resource: 'BloodRequest',
      resourceId: newRequest._id.toString(),
      details: { requestNumber, bloodGroup, unitsRequired }
    });

    res.status(201).json({
      success: true,
      request: newRequest
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all blood requests with filtering and pagination
// @route GET /api/requests
const getRequests = async (req, res) => {
  try {
    const { status, bloodGroup, emergencyLevel, search, mineOnly } = req.query;
    const filter = {};

    if (mineOnly === 'true' && req.user) {
      filter.patientId = req.user._id;
    }
    if (status) filter.status = status;
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (emergencyLevel) filter.emergencyLevel = emergencyLevel;
    if (search) {
      filter.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { hospitalName: { $regex: search, $options: 'i' } },
        { requestNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const requests = await BloodRequest.find(filter)
      .populate('patientId', 'name email phone')
      .populate('verifiedByHospital', 'hospitalName contactPhone')
      .populate('reservedBloodBank', 'name phone address')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get single blood request details & matches
// @route GET /api/requests/:id
const getRequestById = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('patientId', 'name email phone')
      .populate('verifiedByHospital', 'hospitalName contactPhone address')
      .populate('reservedBloodBank', 'name phone address city operatingHours');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Blood request not found' });
    }

    // Fetch matches for this request
    const matches = await BloodMatch.find({ requestId: request._id })
      .populate('bloodBankId', 'name phone address operatingHours')
      .populate('donorId');

    // Run AI Source Matching if not existing
    const aiSources = await aiService.findMatches(
      request.bloodGroup,
      request.unitsRequired,
      request.hospitalLocation.coordinates,
      request.emergencyLevel
    );

    res.json({
      success: true,
      request,
      matches,
      aiSources
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Hospital verifies a request
// @route PUT /api/requests/:id/verify
const verifyRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const hospital = await Hospital.findOne({ userId: req.user._id });

    request.status = 'Verified';
    if (hospital) request.verifiedByHospital = hospital._id;
    request.statusHistory.push({
      status: 'Verified',
      updatedBy: req.user._id,
      role: req.user.role,
      note: req.body.note || 'Hospital verified patient diagnosis and blood requirement.',
      timestamp: new Date()
    });

    await request.save();

    // Notify patient
    await Notification.create({
      recipientId: request.patientId,
      title: 'Blood Request Verified',
      message: `Your request ${request.requestNumber} has been verified by ${hospital ? hospital.hospitalName : 'Hospital Staff'}. Searching for compatible blood sources now.`,
      type: 'REQUEST_UPDATE',
      link: `/requests/${request._id}`
    });

    emitRequestUpdate(request._id.toString(), 'request_status_changed', {
      requestId: request._id,
      status: 'Verified',
      request
    });

    // Notify eligible volunteer donors upon verification
    await notifyEligibleDonorsForRequest(request);

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Blood Bank accepts request and reserves units
const reserveBloodBank = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const bloodBank = await BloodBank.findOne({ userId: req.user._id });
    if (!bloodBank) {
      return res.status(403).json({ success: false, message: 'Only authorized Blood Bank staff can reserve blood stock' });
    }

    // Process expiries & sync first
    await autoSyncAndCheckExpiries(bloodBank._id);

    const now = new Date();
    // Find available, non-expired blood units
    const availableUnits = await BloodUnit.find({
      bloodBankId: bloodBank._id,
      bloodGroup: request.bloodGroup,
      status: 'AVAILABLE',
      expiryDate: { $gte: now }
    }).sort({ expiryDate: 1 });

    const totalAvailableQty = availableUnits.reduce((acc, u) => acc + u.quantity, 0);

    if (totalAvailableQty < request.unitsRequired) {
      return res.status(400).json({
        success: false,
        message: `Insufficient valid non-expired stock. Available non-expired: ${totalAvailableQty} units.`
      });
    }

    // Reserve required units from available non-expired units
    let remainingToReserve = request.unitsRequired;
    for (const unit of availableUnits) {
      if (remainingToReserve <= 0) break;
      if (unit.quantity <= remainingToReserve) {
        remainingToReserve -= unit.quantity;
        unit.status = 'RESERVED';
        await unit.save();
      } else {
        // Split unit if quantity > remainingToReserve
        const reservedQty = remainingToReserve;
        unit.quantity -= reservedQty;
        await unit.save();

        await BloodUnit.create({
          bloodBankId: bloodBank._id,
          unitId: `${unit.unitId}-RES`,
          bloodGroup: unit.bloodGroup,
          componentType: unit.componentType,
          collectionDate: unit.collectionDate,
          expiryDate: unit.expiryDate,
          quantity: reservedQty,
          storageLocation: unit.storageLocation,
          status: 'RESERVED',
          notes: `Reserved for Request ${request.requestNumber}`
        });

        remainingToReserve = 0;
      }
    }

    // Re-sync inventory aggregate numbers
    await autoSyncAndCheckExpiries(bloodBank._id);

    // Log Inventory Transaction
    await InventoryTransaction.create({
      bloodBankId: bloodBank._id,
      bloodGroup: request.bloodGroup,
      type: 'RESERVE',
      units: request.unitsRequired,
      referenceRequestId: request._id,
      performedBy: req.user._id,
      notes: `Reserved ${request.unitsRequired} non-expired units for request ${request.requestNumber}`
    });

    request.status = 'Reserved';
    request.reservedBloodBank = bloodBank._id;
    request.statusHistory.push({
      status: 'Reserved',
      updatedBy: req.user._id,
      role: req.user.role,
      note: `Blood Bank ${bloodBank.name} reserved ${request.unitsRequired} units of ${request.bloodGroup}.`,
      timestamp: new Date()
    });

    await request.save();

    // Notify patient & hospital
    await Notification.create({
      recipientId: request.patientId,
      title: 'Blood Reserved!',
      message: `${bloodBank.name} has reserved ${request.unitsRequired} units of ${request.bloodGroup} for your request (${request.requestNumber}).`,
      type: 'MATCH_FOUND',
      link: `/requests/${request._id}`
    });

    emitRequestUpdate(request._id.toString(), 'request_status_changed', {
      requestId: request._id,
      status: 'Reserved',
      request
    });

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc Confirm blood received & mark fulfilled
// @route PUT /api/requests/:id/fulfill
const fulfillRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.reservedBloodBank) {
      const inventory = await BloodInventory.findOne({
        bloodBankId: request.reservedBloodBank,
        bloodGroup: request.bloodGroup
      });

      if (inventory && inventory.reservedUnits >= request.unitsRequired) {
        inventory.reservedUnits -= request.unitsRequired;
        inventory.lastUpdated = new Date();
        await inventory.save();

        await InventoryTransaction.create({
          bloodBankId: request.reservedBloodBank,
          bloodGroup: request.bloodGroup,
          type: 'DEDUCT',
          units: request.unitsRequired,
          referenceRequestId: request._id,
          performedBy: req.user._id,
          notes: `Fulfilled and issued ${request.unitsRequired} units for request ${request.requestNumber}`
        });
      }
    }

    // Mark any matched donor records as FULFILLED and update donor lastDonationDate
    if (request.matchedDonors && request.matchedDonors.length > 0) {
      const Donor = require('../models/Donor');
      for (const donorId of request.matchedDonors) {
        await BloodMatch.findOneAndUpdate(
          { requestId: request._id, donorId },
          { status: 'FULFILLED', responseTimestamp: new Date() }
        );
        const donorDoc = await Donor.findById(donorId);
        if (donorDoc) {
          donorDoc.lastDonationDate = new Date();
          donorDoc.totalDonations = (donorDoc.totalDonations || 0) + 1;
          await donorDoc.save();
        }
      }
    }

    request.status = 'Fulfilled';
    request.fulfilledAt = new Date();
    request.statusHistory.push({
      status: 'Fulfilled',
      updatedBy: req.user._id,
      role: req.user.role,
      note: req.body.note || 'Blood received at hospital and transfusion completed.',
      timestamp: new Date()
    });

    await request.save();

    await Notification.create({
      recipientId: request.patientId,
      title: 'Request Fulfilled Successfully',
      message: `Your emergency request (${request.requestNumber}) has been completed. Thank you to all healthcare staff and donors!`,
      type: 'REQUEST_UPDATE',
      link: `/requests/${request._id}`
    });

    emitRequestUpdate(request._id.toString(), 'request_status_changed', {
      requestId: request._id,
      status: 'Fulfilled',
      request
    });

    logAuditAction({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'FULFILL_BLOOD_REQUEST',
      resource: 'BloodRequest',
      resourceId: request._id.toString()
    });

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Generic status update (including request cancellation)
// @route PUT /api/requests/:id/status
const updateStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Ownership & Authorization check (IDOR protection)
    const isOwner = request.patientId && request.patientId.toString() === req.user._id.toString();
    const isAuthorizedRole = ['admin', 'hospital', 'bloodbank'].includes(req.user.role);

    if (!isOwner && !isAuthorizedRole) {
      return res.status(403).json({ success: false, message: 'Not authorized to update status of this request' });
    }

    // Patients can only cancel their own request, not arbitrarily set system statuses
    if (isOwner && !isAuthorizedRole && status !== 'Cancelled') {
      return res.status(403).json({ success: false, message: 'Patients can only cancel their own blood requests' });
    }

    // Stock release logic: If request is cancelled and blood was reserved, return stock to bank
    if (status === 'Cancelled' && request.reservedBloodBank && (request.status === 'Reserved' || request.status === 'Matched')) {
      const inventory = await BloodInventory.findOne({
        bloodBankId: request.reservedBloodBank,
        bloodGroup: request.bloodGroup
      });

      if (inventory && inventory.reservedUnits >= request.unitsRequired) {
        inventory.reservedUnits -= request.unitsRequired;
        inventory.availableUnits += request.unitsRequired;
        inventory.lastUpdated = new Date();
        await inventory.save();

        await InventoryTransaction.create({
          bloodBankId: request.reservedBloodBank,
          bloodGroup: request.bloodGroup,
          type: 'RELEASE',
          units: request.unitsRequired,
          referenceRequestId: request._id,
          performedBy: req.user._id,
          notes: `Released ${request.unitsRequired} units due to request cancellation`
        });
      }
    }

    request.status = status;
    request.statusHistory.push({
      status,
      updatedBy: req.user._id,
      role: req.user.role,
      note: note || `Status updated to ${status}`,
      timestamp: new Date()
    });

    await request.save();

    emitRequestUpdate(request._id.toString(), 'request_status_changed', {
      requestId: request._id,
      status,
      request
    });

    logAuditAction({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_REQUEST_STATUS',
      resource: 'BloodRequest',
      resourceId: request._id.toString(),
      details: { status, note }
    });

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc On-demand endpoint to trigger notifications to eligible donors for a request
// @route POST /api/requests/:id/notify-donors
const notifyDonors = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Blood request not found' });
    }

    const stats = await notifyEligibleDonorsForRequest(request);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  verifyRequest,
  reserveBloodBank,
  fulfillRequest,
  updateStatus,
  notifyDonors
};
