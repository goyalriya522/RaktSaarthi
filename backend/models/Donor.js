const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  dob: { type: Date },
  city: { type: String, required: true },
  state: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [77.2090, 28.6139] } // [lng, lat]
  },
  isAvailable: { type: Boolean, default: true },
  lastDonationDate: { type: Date },
  totalDonations: { type: Number, default: 0 },
  healthDeclaration: {
    weightKg: { type: Number, default: 65 },
    hasChronicConditions: { type: Boolean, default: false },
    isEligible: { type: Boolean, default: true }
  },
  privacySettings: {
    hidePhonePublicly: { type: Boolean, default: true },
    shareOnlyOnAcceptedMatch: { type: Boolean, default: true }
  }
}, { timestamps: true });

donorSchema.index({ location: '2dsphere' });
donorSchema.index({ bloodGroup: 1, isAvailable: 1 });

module.exports = mongoose.model('Donor', donorSchema);
