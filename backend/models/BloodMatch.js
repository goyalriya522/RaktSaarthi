const mongoose = require('mongoose');

const bloodMatchSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest', required: true },
  sourceType: { type: String, enum: ['BLOOD_BANK', 'DONOR'], required: true },
  bloodBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodBank' },
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
  compatibilityScore: { type: Number, required: true }, // 0 to 100
  distanceKm: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'RESERVED', 'FULFILLED'],
    default: 'PENDING'
  },
  responseTimestamp: { type: Date }
}, { timestamps: true });

bloodMatchSchema.index({ requestId: 1, status: 1 });

module.exports = mongoose.model('BloodMatch', bloodMatchSchema);
