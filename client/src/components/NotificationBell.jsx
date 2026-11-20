import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.data.notifications || []);
      setUnread(data.data.unreadCount || 0);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, []);

  async function markRead(id) {
    await api.patch(`/notifications/${id}/read`);
    await load();
  }

  async function markAll() {
    await api.patch('/notifications/read-all');
    await load();
  }

  return (
    <div className="notify-wrap">
      <button type="button" className="quiet-button" onClick={() => setOpen((value) => !value)} aria-label="Notifications">
        <Bell size={16} />
        {unread > 0 && <span className="notify-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notify-panel">
          <div className="notify-head">
            <strong>Notifications</strong>
            {unread > 0 && <button type="button" onClick={markAll}>Mark all read</button>}
          </div>
          {items.length === 0 ? (
            <p className="notify-empty">No notifications yet.</p>
          ) : items.map((item) => (
            <Link
              key={item._id}
              className={`notify-item ${item.readAt ? '' : 'is-unread'}`}
              to={item.link || '/textiles'}
              onClick={() => { markRead(item._id); setOpen(false); }}
            >
              <b>{item.title}</b>
              <span>{item.message}</span>
              <time>{new Date(item.createdAt).toLocaleString()}</time>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
