const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, default: 'System' },
  userRole: { type: String, default: 'system' },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String, default: '127.0.0.1' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

auditLogSchema.index({ timestamp: -1, action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
