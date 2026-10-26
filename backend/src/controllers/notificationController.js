import Notification from '../models/Notification.js';

// GET /api/notifications — current user's notifications
export async function getNotifications(req, res) {
  const { unreadOnly, page = 1, limit = 20 } = req.query;
  const filter = { recipient: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const skip = Math.max((parseInt(page, 10) - 1) * parseInt(limit, 10), 0);
  const limitNum = Math.min(parseInt(limit, 10), 100);

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .populate('report', 'reportId title')
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  res.json({ items, page: parseInt(page, 10), limit: limitNum, total, unreadCount });
}

// PATCH /api/notifications/:id/read — mark single notification read
export async function markRead(req, res) {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id,
  });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  notification.isRead = true;
  await notification.save();
  res.json({ message: 'Notification marked as read', notification });
}

// POST /api/notifications/mark-all-read
export async function markAllRead(req, res) {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );
  res.json({ message: 'All notifications marked as read' });
}

// DELETE /api/notifications/:id
export async function deleteNotification(req, res) {
  const result = await Notification.deleteOne({
    _id: req.params.id,
    recipient: req.user._id,
  });
  if (result.deletedCount === 0) return res.status(404).json({ message: 'Notification not found' });
  res.json({ message: 'Notification deleted' });
}

export default { getNotifications, markRead, markAllRead, deleteNotification };
