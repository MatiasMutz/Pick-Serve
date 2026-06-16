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
  if (m < 1) return 'Ahora';
  if (m < 60) return `Hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

function notifMeta(msg: string): { icon: string; color: string; bg: string } {
  if (msg.includes('cerrada') || msg.includes('Cerrada'))
    return { icon: 'lock', color: 'text-red-400', bg: 'bg-red-500/10' };
  if (msg.includes('Acertaste') || msg.includes('acertaste'))
    return { icon: 'check_circle', color: 'text-green-400', bg: 'bg-green-500/10' };
  return { icon: 'notifications', color: 'text-orange-accent', bg: 'bg-orange-accent/10' };
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

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-on-surface-variant text-sm">
        <div className="spinner" /> Cargando...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">Notificaciones</p>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
          Actualizar
        </button>
      </div>

      {notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant text-sm gap-3">
          <span className="material-symbols-outlined opacity-30" style={{ fontSize: 48 }}>notifications_off</span>
          Sin notificaciones por ahora
        </div>
      ) : (
        <div className="bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden">
          {notifs.map(n => {
            const { icon, color, bg } = notifMeta(n.message);
            return (
              <div
                key={n.id}
                onClick={() => handleRead(n.id)}
                className={`flex items-start gap-3 px-4 py-4 border-b border-outline-variant/20 last:border-0 cursor-pointer hover:bg-surface-container-high transition-colors ${
                  n.read ? 'opacity-50' : ''
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                  <span className={`material-symbols-outlined ${color}`} style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                    {icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-on-surface leading-snug">{n.message}</div>
                  <div className="text-xs text-on-surface-variant mt-1">{timeAgo(n.created_at)}</div>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-orange-accent flex-shrink-0 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
