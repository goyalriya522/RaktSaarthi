const mongoose = require('mongoose');

const thalassemiaProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  hospitalName: { type: String, required: true },
  transfusionIntervalDays: { type: Number, required: true, default: 21 }, // e.g. 14, 21, 30 days
  lastTransfusionDate: { type: Date, required: true },
  nextExpectedDate: { type: Date, required: true },
  preferredBloodBank: { type: String, default: '' },
  contactPhone: { type: String, required: true },
  notes: { type: String, default: '' },
  remindersSent: [{
    sentAt: { type: Date, default: Date.now },
    type: { type: String, default: 'UPCOMING_REMINDER' }
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

thalassemiaProfileSchema.index({ userId: 1, nextExpectedDate: 1 });

module.exports = mongoose.model('ThalassemiaProfile', thalassemiaProfileSchema);
