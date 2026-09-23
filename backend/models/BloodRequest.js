const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String },
  note: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const bloodRequestSchema = new mongoose.Schema({
  requestNumber: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  unitsRequired: { type: Number, required: true, min: 1 },
  hospitalName: { type: String, required: true },
  hospitalAddress: { type: String, required: true },
  hospitalLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [77.2090, 28.6139] }
  },
  emergencyLevel: {
    type: String,
    enum: ['CRITICAL', 'URGENT', 'ROUTINE'],
    default: 'URGENT'
  },
  requiredByDate: { type: Date, required: true },
  contactPhone: { type: String, required: true },
  contactName: { type: String, required: true },
  reason: { type: String, required: true },
  supportingDocs: [{
    fileUrl: String,
    fileName: String,
    fileType: String
  }],
  status: {
    type: String,
    enum: [
      'Submitted',
      'Under Verification',
      'Verified',
      'Searching',
      'Matched',
      'Reserved',
      'Blood Received',
      'Fulfilled',
      'Rejected',
      'Cancelled',
      'Expired'
    ],
    default: 'Submitted'
  },
  verifiedByHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  reservedBloodBank: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodBank' },
  matchedDonors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Donor' }],
  statusHistory: [statusHistorySchema],
  aiAnalysis: {
    priorityScore: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    matchedSourcesCount: { type: Number, default: 0 },
    recommendations: { type: String, default: '' }
  },
  fulfilledAt: { type: Date },
  clientRequestId: { type: String, sparse: true, index: true }
}, { timestamps: true });

bloodRequestSchema.index({ hospitalLocation: '2dsphere' });
bloodRequestSchema.index({ status: 1, bloodGroup: 1, emergencyLevel: 1 });

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);

