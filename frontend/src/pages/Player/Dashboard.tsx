import { useState } from 'react';
import type { AuthUser } from '../../types';
import Predictions from './Predictions';
import Ranking from './Ranking';
import Notifications from './Notifications';
import Stats from './Stats';

interface Props {
  user: AuthUser;
  onLogout: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

type Tab = 'predictions' | 'ranking' | 'notifications' | 'stats';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'predictions', label: 'Jornada', icon: '🎾' },
  { id: 'ranking', label: 'Ranking', icon: '🏆' },
  { id: 'notifications', label: 'Alertas', icon: '🔔' },
  { id: 'stats', label: 'Stats', icon: '📊' },
];

export default function PlayerDashboard({ user, onLogout, showToast }: Props) {
  const [tab, setTab] = useState<Tab>('predictions');
  const [unread, setUnread] = useState(0);

  return (
    <>
      <div className="app-container">
        <div className="header">
          <div className="header-logo">Pick <span style={{ color: 'var(--accent)' }}>&</span> Serve</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.name.split(' ')[0]}</span>
            <button className="btn btn-secondary btn-sm" onClick={onLogout}>Salir</button>
          </div>
        </div>

        {tab === 'predictions' && <Predictions userId={user.user_id} showToast={showToast} />}
        {tab === 'ranking' && <Ranking />}
        {tab === 'notifications' && <Notifications userId={user.user_id} onUnreadChange={setUnread} />}
        {tab === 'stats' && <Stats userId={user.user_id} />}
      </div>

      <nav className="nav">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`nav-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span style={{ fontSize: 20, position: 'relative' }}>
              {t.icon}
              {t.id === 'notifications' && unread > 0 && (
                <span className="badge" style={{ position: 'absolute', top: -4, right: -6, fontSize: 9, minWidth: 16, height: 16 }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  );
}
