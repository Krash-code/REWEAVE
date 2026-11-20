import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../services/notificationService.js';

export async function getNotifications(req, res) {
  const unreadOnly = req.query.unread === 'true';
  const notifications = await listNotifications(req.user._id, { unreadOnly });
  const unreadCount = unreadOnly
    ? notifications.length
    : notifications.filter((item) => !item.readAt).length;
  return res.json({
    success: true,
    data: { notifications, unreadCount, count: notifications.length }
  });
}

export async function readNotification(req, res) {
  const notification = await markNotificationRead(req.user._id, req.params.id);
  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }
  return res.json({ success: true, data: { notification } });
}

export async function readAllNotifications(req, res) {
  const result = await markAllNotificationsRead(req.user._id);
  return res.json({ success: true, data: { updated: result.modifiedCount } });
}
