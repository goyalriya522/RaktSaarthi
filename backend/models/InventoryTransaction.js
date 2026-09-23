const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  bloodBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodBank', required: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  type: {
    type: String,
    enum: ['ADD', 'RESERVE', 'RELEASE', 'DEDUCT', 'DISCARD'],
    required: true
  },
  units: { type: Number, required: true },
  referenceRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

inventoryTransactionSchema.index({ bloodBankId: 1, timestamp: -1 });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
