const mongoose = require('mongoose');
const BloodInventory = require('../models/BloodInventory');
const BloodBank = require('../models/BloodBank');
const BloodUnit = require('../models/BloodUnit');
const InventoryTransaction = require('../models/InventoryTransaction');
const Notification = require('../models/Notification');
const logAuditAction = require('../utils/auditLogger');
const { emitToRole } = require('../sockets/socketHandler');

/**
 * Helper to compute expiry details for a single unit
 */
const formatUnitWithExpiry = (unit) => {
  const unitObj = unit.toObject ? unit.toObject() : { ...unit };
  const now = new Date();
  const expiry = new Date(unitObj.expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let computedStatus = 'Safe / Available';
  if (unitObj.status === 'DISCARDED') {
    computedStatus = 'Discarded';
  } else if (unitObj.status === 'RESERVED') {
    computedStatus = 'Reserved';
  } else if (unitObj.status === 'EXPIRED' || daysRemaining < 0) {
    computedStatus = 'Expired';
  } else if (daysRemaining <= 7) {
    computedStatus = 'Expiring Soon';
  }

  return {
    ...unitObj,
    daysRemaining,
    computedStatus
  };
};

/**
 * Helper to automatically check expiries & sync BloodInventory aggregate stock
 */
const autoSyncAndCheckExpiries = async (bloodBankId) => {
  if (!bloodBankId) return;

  const bId = typeof bloodBankId === 'object' && bloodBankId._id ? bloodBankId._id : bloodBankId;
  const now = new Date();

  // 1. Automatically update units past expiry date to 'EXPIRED'
  const newlyExpiredUnits = await BloodUnit.find({
    bloodBankId: bId,
    status: 'AVAILABLE',
    expiryDate: { $lt: now }
  });

  if (newlyExpiredUnits.length > 0) {
    for (const unit of newlyExpiredUnits) {
      unit.status = 'EXPIRED';
      await unit.save();

      // Log transaction
      await InventoryTransaction.create({
        bloodBankId: bId,
        bloodGroup: unit.bloodGroup,
        type: 'DISCARD',
        units: unit.quantity,
        performedBy: bId,
        notes: `Unit ${unit.unitId} (${unit.componentType}) automatically marked EXPIRED`
      });
    }

    // Create staff notification for expired units
    const groupCounts = {};
    newlyExpiredUnits.forEach(u => {
      const key = `${u.bloodGroup} ${u.componentType}`;
      groupCounts[key] = (groupCounts[key] || 0) + u.quantity;
    });

    const summaryText = Object.entries(groupCounts)
      .map(([key, count]) => `${count} ${key}`)
      .join(', ');

    const bloodBank = await BloodBank.findById(bId);
    if (bloodBank) {
      await Notification.create({
        recipientId: bloodBank.userId,
        recipientRole: 'bloodbank',
        title: 'Blood Units Expired Alert',
        message: `❌ ${summaryText} unit(s) have expired and have been removed from available inventory.`,
        type: 'INVENTORY_ALERT',
        link: '/bloodbank/dashboard'
      });
    }
  }

  // 2. Backfill/Migrate existing BloodInventory records into BloodUnit items if no BloodUnit records exist yet
  const existingUnitsCount = await BloodUnit.countDocuments({ bloodBankId: bId });
  if (existingUnitsCount === 0) {
    const existingInventories = await BloodInventory.find({ bloodBankId: bId });
    for (const inv of existingInventories) {
      if (inv.availableUnits > 0) {
        // Create unit records for existing legacy available stock
        const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await BloodUnit.create({
          bloodBankId: bId,
          unitId: `UNIT-${inv.bloodGroup.replace('+', 'P').replace('-', 'N')}-${Math.floor(1000 + Math.random() * 9000)}`,
          bloodGroup: inv.bloodGroup,
          componentType: 'Whole Blood',
          collectionDate: new Date(),
          expiryDate: defaultExpiry,
          quantity: inv.availableUnits,
          storageLocation: 'Main Cold Room - Shelf 1',
          status: 'AVAILABLE'
        });
      }
    }
  }

  // 3. Re-aggregate available & reserved units into BloodInventory table
  const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const bankObjId = new mongoose.Types.ObjectId(bId.toString());

  for (const bg of groups) {
    const availableAgg = await BloodUnit.aggregate([
      {
        $match: {
          bloodBankId: bankObjId,
          bloodGroup: bg,
          status: 'AVAILABLE',
          expiryDate: { $gte: now }
        }
      },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    const reservedAgg = await BloodUnit.aggregate([
      {
        $match: {
          bloodBankId: bankObjId,
          bloodGroup: bg,
          status: 'RESERVED'
        }
      },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    const availUnits = availableAgg.length > 0 ? availableAgg[0].total : 0;
    const resUnits = reservedAgg.length > 0 ? reservedAgg[0].total : 0;

    await BloodInventory.findOneAndUpdate(
      { bloodBankId: bId, bloodGroup: bg },
      {
        availableUnits: availUnits,
        reservedUnits: resUnits,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
  }
};

// @desc Get central public blood availability across all banks
// @route GET /api/inventory/availability
const getPublicAvailability = async (req, res) => {
  try {
    const { bloodGroup, city, search } = req.query;

    // Run auto-sync across all verified blood banks
    const banks = await BloodBank.find({ isVerified: true });
    for (const bank of banks) {
      await autoSyncAndCheckExpiries(bank._id);
    }

    const filter = {};
    if (bloodGroup) filter.bloodGroup = bloodGroup;

    let inventories = await BloodInventory.find(filter)
      .populate('bloodBankId', 'name address city phone operatingHours location isVerified');

    if (city) {
      inventories = inventories.filter(inv => inv.bloodBankId && inv.bloodBankId.city.toLowerCase().includes(city.toLowerCase()));
    }

    if (search) {
      inventories = inventories.filter(inv => inv.bloodBankId && inv.bloodBankId.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Compute central public expiry alerts across verified banks
    const bankIds = banks.map(b => b._id);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const rawExpiringUnits = await BloodUnit.find({
      bloodBankId: { $in: bankIds },
      status: 'AVAILABLE',
      expiryDate: { $gte: now, $lte: sevenDaysFromNow }
    }).sort({ expiryDate: 1 }).populate('bloodBankId', 'name city');

    const formattedExpiringUnits = rawExpiringUnits.map(formatUnitWithExpiry);

    const groupMap = {};
    let totalExpiringSoonUnits = 0;
    let criticalWarning = false;

    formattedExpiringUnits.forEach(unit => {
      totalExpiringSoonUnits += unit.quantity;
      if (unit.daysRemaining <= 3) {
        criticalWarning = true;
      }
      const bg = unit.bloodGroup;
      if (!groupMap[bg]) {
        groupMap[bg] = {
          bloodGroup: bg,
          units: 0,
          minDaysRemaining: unit.daysRemaining,
          earliestExpiryDate: unit.expiryDate
        };
      }
      groupMap[bg].units += unit.quantity;
      if (unit.daysRemaining < groupMap[bg].minDaysRemaining) {
        groupMap[bg].minDaysRemaining = unit.daysRemaining;
        groupMap[bg].earliestExpiryDate = unit.expiryDate;
      }
    });

    const groupedAlerts = Object.values(groupMap).sort((a, b) => a.minDaysRemaining - b.minDaysRemaining);

    res.json({
      success: true,
      count: inventories.length,
      inventories,
      expiryAlerts: {
        totalExpiringSoon: totalExpiringSoonUnits,
        criticalWarning,
        groupedAlerts,
        items: formattedExpiringUnits.slice(0, 10).map(u => ({
          _id: u._id,
          unitId: u.unitId,
          bloodGroup: u.bloodGroup,
          componentType: u.componentType,
          quantity: u.quantity,
          expiryDate: u.expiryDate,
          daysRemaining: u.daysRemaining,
          bankName: u.bloodBankId ? u.bloodBankId.name : 'Blood Bank'
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get current blood bank inventory and detailed blood units with expiry stats
// @route GET /api/inventory/my-bank
const getMyBankInventory = async (req, res) => {
  try {
    const bloodBank = await BloodBank.findOne({ userId: req.user._id });
    if (!bloodBank) {
      return res.status(404).json({ success: false, message: 'Blood bank profile not found' });
    }

    // Auto sync & process expiries first
    await autoSyncAndCheckExpiries(bloodBank._id);

    const inventories = await BloodInventory.find({ bloodBankId: bloodBank._id });

    // Guarantee all 8 blood groups exist in summary
    const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const resultMap = {};
    groups.forEach(g => {
      resultMap[g] = {
        bloodGroup: g,
        availableUnits: 0,
        reservedUnits: 0,
        batches: [],
        lastUpdated: new Date()
      };
    });

    inventories.forEach(inv => {
      resultMap[inv.bloodGroup] = inv;
    });

    // Fetch all individual BloodUnits
    const rawUnits = await BloodUnit.find({ bloodBankId: bloodBank._id }).sort({ expiryDate: 1 });
    const formattedUnits = rawUnits.map(formatUnitWithExpiry);

    // Compute Dashboard Statistics & Alert Lists
    let totalBloodUnits = 0;
    let availableUnitsCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;

    const expiringSoonAlerts = [];
    const expiredAlerts = [];

    formattedUnits.forEach(u => {
      totalBloodUnits += u.quantity;
      if (u.computedStatus === 'Safe / Available') {
        availableUnitsCount += u.quantity;
      } else if (u.computedStatus === 'Expiring Soon') {
        availableUnitsCount += u.quantity;
        expiringSoonCount += u.quantity;
        expiringSoonAlerts.push(u);
      } else if (u.computedStatus === 'Expired') {
        expiredCount += u.quantity;
        expiredAlerts.push(u);
      }
    });

    res.json({
      success: true,
      bloodBank,
      inventories: Object.values(resultMap),
      units: formattedUnits,
      stats: {
        totalBloodUnits,
        availableUnits: availableUnitsCount,
        expiringSoon: expiringSoonCount,
        expiredUnits: expiredCount
      },
      alerts: {
        expiringSoonAlerts,
        expiredAlerts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Add a new blood unit to inventory
// @route POST /api/inventory/units
const createBloodUnit = async (req, res) => {
  try {
    const {
      unitId,
      bloodGroup,
      componentType,
      collectionDate,
      expiryDate,
      quantity,
      storageLocation,
      notes
    } = req.body;

    const bloodBank = await BloodBank.findOne({ userId: req.user._id });
    if (!bloodBank) {
      return res.status(403).json({ success: false, message: 'Authorized Blood Bank profile required' });
    }

    if (!bloodGroup || !expiryDate) {
      return res.status(400).json({ success: false, message: 'Blood group and expiry date are required' });
    }

    // Auto generate unit ID if missing
    const generatedId = unitId || `UNIT-${bloodGroup.replace('+', 'P').replace('-', 'N')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newUnit = await BloodUnit.create({
      bloodBankId: bloodBank._id,
      unitId: generatedId,
      bloodGroup,
      componentType: componentType || 'Whole Blood',
      collectionDate: collectionDate || new Date(),
      expiryDate: new Date(expiryDate),
      quantity: parseInt(quantity) || 1,
      storageLocation: storageLocation || 'Main Cold Room - Rack A',
      notes: notes || ''
    });

    // Log transaction
    await InventoryTransaction.create({
      bloodBankId: bloodBank._id,
      bloodGroup,
      type: 'ADD',
      units: newUnit.quantity,
      performedBy: req.user._id,
      notes: `Added Blood Unit ${newUnit.unitId} (${newUnit.componentType})`
    });

    await autoSyncAndCheckExpiries(bloodBank._id);

    logAuditAction({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CREATE_BLOOD_UNIT',
      resource: 'BloodUnit',
      resourceId: newUnit._id.toString(),
      details: { unitId: newUnit.unitId, bloodGroup, componentType: newUnit.componentType, quantity: newUnit.quantity }
    });

    res.status(201).json({ success: true, unit: formatUnitWithExpiry(newUnit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update existing blood unit (dates, component, storage location, status)
// @route PUT /api/inventory/units/:id
const updateBloodUnit = async (req, res) => {
  try {
    const {
      unitId,
      bloodGroup,
      componentType,
      collectionDate,
      expiryDate,
      quantity,
      storageLocation,
      status,
      notes
    } = req.body;

    const bloodBank = await BloodBank.findOne({ userId: req.user._id });
    if (!bloodBank) {
      return res.status(403).json({ success: false, message: 'Authorized Blood Bank profile required' });
    }

    const unit = await BloodUnit.findOne({ _id: req.params.id, bloodBankId: bloodBank._id });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Blood unit record not found' });
    }

    if (unitId) unit.unitId = unitId;
    if (bloodGroup) unit.bloodGroup = bloodGroup;
    if (componentType) unit.componentType = componentType;
    if (collectionDate) unit.collectionDate = new Date(collectionDate);
    if (expiryDate) unit.expiryDate = new Date(expiryDate);
    if (quantity !== undefined) unit.quantity = parseInt(quantity);
    if (storageLocation) unit.storageLocation = storageLocation;
    if (status) unit.status = status;
    if (notes !== undefined) unit.notes = notes;

    await unit.save();
    await autoSyncAndCheckExpiries(bloodBank._id);

    logAuditAction({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_BLOOD_UNIT',
      resource: 'BloodUnit',
      resourceId: unit._id.toString(),
      details: { unitId: unit.unitId, bloodGroup: unit.bloodGroup, expiryDate: unit.expiryDate }
    });

    res.json({ success: true, unit: formatUnitWithExpiry(unit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete / Discard a blood unit
// @route DELETE /api/inventory/units/:id
const deleteBloodUnit = async (req, res) => {
  try {
    const bloodBank = await BloodBank.findOne({ userId: req.user._id });
    if (!bloodBank) {
      return res.status(403).json({ success: false, message: 'Authorized Blood Bank profile required' });
    }

    const unit = await BloodUnit.findOne({ _id: req.params.id, bloodBankId: bloodBank._id });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Blood unit record not found' });
    }

    await InventoryTransaction.create({
      bloodBankId: bloodBank._id,
      bloodGroup: unit.bloodGroup,
      type: 'DISCARD',
      units: unit.quantity,
      performedBy: req.user._id,
      notes: `Removed/Discarded Blood Unit ${unit.unitId}`
    });

    await BloodUnit.deleteOne({ _id: unit._id });
    await autoSyncAndCheckExpiries(bloodBank._id);

    res.json({ success: true, message: 'Blood unit removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Legacy Update stock (Add/Edit units & batch info)
// @route POST /api/inventory/update
const updateStock = async (req, res) => {
  try {
    const { bloodGroup, availableUnits, batchNo, expiryDate, note } = req.body;

    const bloodBank = await BloodBank.findOne({ userId: req.user._id });
    if (!bloodBank) {
      return res.status(403).json({ success: false, message: 'Authorized Blood Bank profile required' });
    }

    const newUnits = parseInt(availableUnits) || 0;

    // Create a new BloodUnit for this stock update
    if (newUnits > 0) {
      await BloodUnit.create({
        bloodBankId: bloodBank._id,
        unitId: batchNo || `UNIT-${bloodGroup.replace('+', 'P').replace('-', 'N')}-${Math.floor(1000 + Math.random() * 9000)}`,
        bloodGroup,
        componentType: 'Whole Blood',
        collectionDate: new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        quantity: newUnits,
        storageLocation: 'Main Cold Room - Rack A',
        status: 'AVAILABLE'
      });
    }

    await autoSyncAndCheckExpiries(bloodBank._id);

    // Log transaction
    await InventoryTransaction.create({
      bloodBankId: bloodBank._id,
      bloodGroup,
      type: 'ADD',
      units: newUnits,
      performedBy: req.user._id,
      notes: note || `Stock updated to ${newUnits} units`
    });

    res.json({ success: true, message: 'Stock updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get transaction audit log for blood bank
// @route GET /api/inventory/transactions
const getTransactions = async (req, res) => {
  try {
    const bloodBank = await BloodBank.findOne({ userId: req.user._id });
    const filter = {};
    if (bloodBank) filter.bloodBankId = bloodBank._id;

    const transactions = await InventoryTransaction.find(filter)
      .populate('performedBy', 'name email')
      .populate('referenceRequestId', 'requestNumber patientName')
      .sort({ timestamp: -1 });

    res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPublicAvailability,
  getMyBankInventory,
  createBloodUnit,
  updateBloodUnit,
  deleteBloodUnit,
  updateStock,
  getTransactions,
  autoSyncAndCheckExpiries
};

