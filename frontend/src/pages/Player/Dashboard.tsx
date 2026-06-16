import { useState } from 'react';
import type { AuthUser } from '../../types';
import Predictions from './Predictions';
import Ranking from './Ranking';
import Notifications from './Notifications';
import Stats from './Stats';
import { IconHome, IconTrophy, IconBell, IconChart, IconLogout } from '../../components/Icons';

interface Props {
  user: AuthUser;
  onLogout: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

type Tab = 'home' | 'ranking' | 'notifications' | 'stats';

const tabs: { id: Tab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'home',          label: 'Inicio',        Icon: IconHome },
  { id: 'ranking',       label: 'Ranking',       Icon: IconTrophy },
  { id: 'notifications', label: 'Alertas',       Icon: IconBell },
  { id: 'stats',         label: 'Stats',         Icon: IconChart },
];

export default function PlayerDashboard({ user, onLogout, showToast }: Props) {
  const [tab, setTab] = useState<Tab>('home');
  const [unread, setUnread] = useState(0);

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-logo">Pick <span>&</span> Serve</div>
        <div className="topbar-right">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.name.split(' ')[0]}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout} title="Salir">
            <IconLogout size={14} />
          </button>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        {tab === 'home'          && <Predictions userId={user.user_id} showToast={showToast} />}
        {tab === 'ranking'       && <Ranking />}
        {tab === 'notifications' && <Notifications userId={user.user_id} onUnreadChange={setUnread} />}
        {tab === 'stats'         && <Stats userId={user.user_id} />}
      </div>

      <nav className="nav">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`nav-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <t.Icon size={20} />
            {t.id === 'notifications' && unread > 0 && (
              <span className="nav-badge">{unread > 9 ? '9+' : unread}</span>
            )}
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
