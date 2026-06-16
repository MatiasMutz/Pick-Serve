import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Notification } from '../../types';
import { IconBell, IconCheck, IconLock, IconRefresh } from '../../components/Icons';

interface Props {
  userId: number;
  onUnreadChange: (n: number) => void;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr + 'Z').getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `Hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

function notifIcon(msg: string) {
  if (msg.includes('cerrada') || msg.includes('Cerrada')) return { Icon: IconLock, type: 'error' };
  if (msg.includes('Acertaste') || msg.includes('acertaste')) return { Icon: IconCheck, type: 'success' };
  return { Icon: IconBell, type: 'info' };
}

export default function Notifications({ userId, onUnreadChange }: Props) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const n = await api.getNotifications(userId);
      setNotifs(n);
      onUnreadChange(n.filter(x => !x.read).length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRead = async (id: number) => {
    const notif = notifs.find(n => n.id === id);
    if (!notif || notif.read) return;
    await api.markNotificationRead(id).catch(() => null);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    onUnreadChange(notifs.filter(x => !x.read && x.id !== id).length);
  };

  if (loading) return <div className="loading"><div className="spinner" /> Cargando...</div>;

  return (
    <div>
      <div className="refresh-row">
        <p className="label" style={{ margin: 0 }}>Notificaciones</p>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <IconRefresh size={13} /> Actualizar
        </button>
      </div>

      {notifs.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><IconBell size={36} /></div>
          Sin notificaciones por ahora
        </div>
      ) : (
        <div className="card">
          {notifs.map(n => {
            const { Icon, type } = notifIcon(n.message);
            return (
              <div
                key={n.id}
                className={`notif-item ${n.read ? 'read' : ''}`}
                onClick={() => handleRead(n.id)}
              >
                <div className={`notif-icon ${type}`}><Icon size={16} /></div>
                <div className="notif-body">
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-time">{timeAgo(n.created_at)}</div>
                </div>
                {!n.read && <div className="notif-unread-dot" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
