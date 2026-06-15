import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Notification } from '../../types';

interface Props {
  userId: number;
  onUnreadChange: (n: number) => void;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr + 'Z').getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default function Notifications({ userId, onUnreadChange }: Props) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const n = await api.getNotifications(userId);
      setNotifs(n);
      onUnreadChange(n.filter(x => !x.read).length);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRead = async (id: number) => {
    const notif = notifs.find(n => n.id === id);
    if (!notif || notif.read) return;
    try {
      await api.markNotificationRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      onUnreadChange(notifs.filter(x => !x.read && x.id !== id).length);
    } catch {
      // silent
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /> Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="section-title" style={{ margin: 0 }}>Notificaciones</span>
        <button className="btn btn-secondary btn-sm" onClick={load}>Refrescar</button>
      </div>

      {notifs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <div className="empty-state-text">Sin notificaciones por ahora</div>
        </div>
      ) : (
        <div className="card">
          {notifs.map(n => (
            <div
              key={n.id}
              className={`notification-item ${n.read ? 'read' : 'unread'}`}
              onClick={() => handleRead(n.id)}
            >
              <div className="notification-dot" style={{ opacity: n.read ? 0 : 1 }} />
              <div>
                <div className="notification-msg">{n.message}</div>
                <div className="notification-time">{timeAgo(n.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
