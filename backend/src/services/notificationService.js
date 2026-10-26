import Notification from '../models/Notification.js';
import { emitToUser, emitToAdmins } from './sseService.js';

/**
 * Centralized notification creation. In-app only for the first release;
 * email integration can be added later behind the same interface.
 * Every notification also triggers a real-time SSE push to the recipient.
 */
export async function notifyUser({ recipient, report, type, title, message }) {
  if (!recipient) return null;
  const notification = await Notification.create({
    recipient,
    report: report || null,
    type,
    title,
    message,
  });
  // Push real-time event to this user
  emitToUser(String(recipient), 'notification', {
    _id: notification._id,
    title,
    message,
    type,
    report: report || null,
    isRead: false,
    createdAt: notification.createdAt,
  });
  return notification;
}

/**
 * Notify all administrators of an event (e.g. a new report awaiting review).
 */
export async function notifyAdmins({ report, type, title, message }) {
  const { default: User } = await import('../models/User.js');
  const admins = await User.find({ role: 'admin' }).select('_id');
  const created = [];
  for (const a of admins) {
    const n = await Notification.create({
      recipient: a._id,
      report,
      type,
      title,
      message,
    });
    // Push real-time event to each admin
    emitToUser(String(a._id), 'notification', {
      _id: n._id,
      title,
      message,
      type,
      report: report || null,
      isRead: false,
      createdAt: n.createdAt,
    });
    created.push(n);
  }
  return created;
}

export default { notifyUser, notifyAdmins };
