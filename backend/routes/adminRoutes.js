const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getUsers,
  getEntities,
  toggleUserStatus,
  verifyEntity,
  getAuditLogs,
  broadcastNotification
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.get('/entities', getEntities);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.put('/verify-entity', verifyEntity);
router.get('/audit-logs', getAuditLogs);
router.post('/broadcast', broadcastNotification);

module.exports = router;
