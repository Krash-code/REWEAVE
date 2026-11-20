import Notification from '../models/Notification.js';

export function notifyUser(userId, payload) {
  if (!userId) return Promise.resolve(null);
  return Notification.create({
    user: userId,
    type: payload.type,
    title: payload.title,
    message: payload.message || '',
    link: payload.link || '',
    relatedTextile: payload.relatedTextile,
    relatedPickup: payload.relatedPickup
  });
}

export async function listNotifications(userId, { unreadOnly = false } = {}) {
  const filter = { user: userId };
  if (unreadOnly) filter.readAt = null;
  return Notification.find(filter).sort({ createdAt: -1 }).limit(50);
}

export function markNotificationRead(userId, notificationId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId, readAt: null },
    { $set: { readAt: new Date() } },
    { new: true }
  );
}

export function markAllNotificationsRead(userId) {
  return Notification.updateMany(
    { user: userId, readAt: null },
    { $set: { readAt: new Date() } }
  );
}
