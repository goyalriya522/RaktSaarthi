const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospitalName: { type: String, required: true },
  registrationNo: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [77.2090, 28.6139] } // [lng, lat]
  },
  contactPerson: { type: String, required: true },
  contactPhone: { type: String, required: true },
  emergencyPhone: { type: String, required: true },
  totalBeds: { type: Number, default: 100 },
  icuBeds: { type: Number, default: 20 },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

hospitalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Hospital', hospitalSchema);
