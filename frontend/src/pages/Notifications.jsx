import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, Mail, MailOpen } from 'lucide-react';
import { notificationApi } from '../services/notificationService.js';
import { errorMessage } from '../services/api.js';
import { timeAgo } from '../utils/format.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';

export default function Notifications() {
  const [data, setData] = useState({ items: [], unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { subscribe, clearUnread } = useRealtime();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const result = await notificationApi.getNotifications({ unreadOnly });
      setData(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => { load(); }, [load]);

  // When a new notification arrives via SSE, prepend it to the list and reload
  useEffect(() => {
    const unsub = subscribe('notification', (incoming) => {
      setData((prev) => ({
        ...prev,
        unreadCount: prev.unreadCount + 1,
        items: [incoming, ...prev.items],
      }));
    });
    return unsub;
  }, [subscribe]);

  const markRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      setData((d) => ({
        ...d,
        unreadCount: Math.max(0, d.unreadCount - 1),
        items: d.items.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      }));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setData((d) => ({ ...d, unreadCount: 0, items: d.items.map((n) => ({ ...n, isRead: true })) }));
      clearUnread();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (id) => {
    try {
      await notificationApi.delete(id);
      setData((d) => ({ ...d, items: d.items.filter((n) => n._id !== id) }));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="container" style={{ maxWidth: 760, paddingBottom: '2rem' }}>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><Bell size={24} color="var(--cyan-500)" /> Notifications</h1>
          <p>{data.unreadCount} unread notification{data.unreadCount !== 1 ? 's' : ''}.</p>
        </div>
        <button className="btn btn-secondary" onClick={markAllRead} disabled={data.unreadCount === 0}>
          <CheckCheck size={16} /> Mark all read
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <label className="flex items-center gap-2" style={{ fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          Show unread only
        </label>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : data.items.length === 0 ? (
        <div className="card empty-state">
          <Bell size={40} />
          <h3>No notifications</h3>
          <p>You're all caught up.</p>
        </div>
      ) : (
        <div className="flex-col gap-2">
          {data.items.map((n) => (
            <div
              key={n._id}
              className="card flex items-start gap-3"
              style={{ borderLeft: n.isRead ? '3px solid var(--border)' : '3px solid var(--cyan-500)', padding: '0.85rem 1rem' }}
            >
              <span style={{ marginTop: 2 }}>{n.isRead ? <MailOpen size={18} className="text-muted" /> : <Mail size={18} color="var(--cyan-500)" />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center justify-between">
                  <strong style={{ color: 'var(--navy-900)' }}>{n.title}</strong>
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>{timeAgo(n.createdAt)}</span>
                </div>
                <p style={{ fontSize: '0.9rem', marginTop: 2 }}>{n.message}</p>
                {n.report && (
                  <Link to={`/reports/${n.report._id || n.report}`} className="mt-2" style={{ fontSize: '0.85rem', display: 'inline-block' }}>
                    View report →
                  </Link>
                )}
              </div>
              <div className="flex-col gap-2">
                {!n.isRead && <button className="btn btn-ghost" onClick={() => markRead(n._id)} title="Mark read"><CheckCheck size={16} /></button>}
                <button className="btn btn-ghost" onClick={() => remove(n._id)} title="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
