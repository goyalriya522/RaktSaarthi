const mongoose = require('mongoose');

const batchDetailSchema = new mongoose.Schema({
  batchNo: { type: String, required: true },
  units: { type: Number, required: true },
  collectionDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true },
  status: { type: String, enum: ['AVAILABLE', 'RESERVED', 'EXPIRED', 'DISCARDED'], default: 'AVAILABLE' }
});

const bloodInventorySchema = new mongoose.Schema({
  bloodBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodBank', required: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  availableUnits: { type: Number, default: 0, min: 0 },
  reservedUnits: { type: Number, default: 0, min: 0 },
  batches: [batchDetailSchema],
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

bloodInventorySchema.index({ bloodBankId: 1, bloodGroup: 1 }, { unique: true });

module.exports = mongoose.model('BloodInventory', bloodInventorySchema);
