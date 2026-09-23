const AuditLog = require('../models/AuditLog');

const logAuditAction = async ({ userId, userName, userRole, action, resource, resourceId, details, ipAddress }) => {
  try {
    await AuditLog.create({
      userId,
      userName: userName || 'System User',
      userRole: userRole || 'system',
      action,
      resource,
      resourceId,
      details,
      ipAddress: ipAddress || '127.0.0.1',
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Audit Log Error:', err.message);
  }
};

module.exports = logAuditAction;
