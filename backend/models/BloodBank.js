const mongoose = require('mongoose');

const bloodBankSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  licenseNo: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [77.2090, 28.6139] } // [lng, lat]
  },
  phone: { type: String, required: true },
  emergencyPhone: { type: String, required: true },
  operatingHours: { type: String, default: '24/7' },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

bloodBankSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('BloodBank', bloodBankSchema);
