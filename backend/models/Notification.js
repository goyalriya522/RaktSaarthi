const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If null, platform wide
  recipientRole: { type: String, enum: ['patient', 'hospital', 'bloodbank', 'admin', 'donor', 'all'], default: 'all' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['REQUEST_UPDATE', 'EMERGENCY_ALERT', 'THALASSEMIA_REMINDER', 'MATCH_FOUND', 'SYSTEM_ADMIN', 'INVENTORY_ALERT', 'DONOR_ELIGIBLE_ALERT'],
    default: 'REQUEST_UPDATE'
  },
  referenceRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest' },
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, referenceRequestId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
