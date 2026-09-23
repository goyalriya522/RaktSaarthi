const Notification = require('../models/Notification');

// @desc Get user's notifications
// @route GET /api/notifications
const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipientId: req.user._id },
        { recipientRole: req.user.role },
        { recipientRole: 'all' }
      ]
    }).sort({ createdAt: -1 }).limit(50);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Mark single notification as read
// @route PUT /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Recipient authorization check
    const isRecipientUser = notification.recipientId && notification.recipientId.toString() === req.user._id.toString();
    const isRecipientRole = notification.recipientRole === req.user.role || notification.recipientRole === 'all';

    if (!isRecipientUser && !isRecipientRole && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to access this notification' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Mark all notifications as read
// @route PUT /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        $or: [
          { recipientId: req.user._id },
          { recipientRole: req.user.role },
          { recipientRole: 'all' }
        ]
      },
      { $set: { isRead: true } }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead
};
