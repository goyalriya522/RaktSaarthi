const mongoose = require('mongoose');

const bloodUnitSchema = new mongoose.Schema({
  bloodBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodBank', required: true },
  unitId: { type: String, required: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  componentType: {
    type: String,
    enum: ['Whole Blood', 'RBC', 'Platelets', 'Plasma'],
    default: 'Whole Blood',
    required: true
  },
  collectionDate: { type: Date, required: true, default: Date.now },
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true, default: 1, min: 1 },
  storageLocation: { type: String, default: 'Main Cold Room - Rack A' },
  status: {
    type: String,
    enum: ['AVAILABLE', 'RESERVED', 'EXPIRED', 'DISCARDED'],
    default: 'AVAILABLE'
  },
  notes: { type: String, default: '' }
}, { timestamps: true });

bloodUnitSchema.index({ bloodBankId: 1, status: 1, expiryDate: 1 });
bloodUnitSchema.index({ bloodBankId: 1, bloodGroup: 1, componentType: 1 });

module.exports = mongoose.model('BloodUnit', bloodUnitSchema);
