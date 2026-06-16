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

type Tab = 'home' | 'ranking' | 'notifications' | 'stats';

const navItems: { id: Tab; icon: string; label: string }[] = [
  { id: 'home',          icon: 'dashboard',     label: 'Dashboard' },
  { id: 'ranking',       icon: 'leaderboard',   label: 'Rankings' },
  { id: 'notifications', icon: 'notifications', label: 'Alertas' },
  { id: 'stats',         icon: 'query_stats',   label: 'Stats' },
];

const pageTitles: Record<Tab, string> = {
  home: 'Dashboard',
  ranking: 'Rankings',
  notifications: 'Alertas',
  stats: 'Estadísticas',
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export default function PlayerDashboard({ user, onLogout, showToast }: Props) {
  const [tab, setTab] = useState<Tab>('home');
  const [unread, setUnread] = useState(0);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex">

      {/* ── Sidebar (desktop) ─────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-0 h-full bg-surface-container-low border-r border-outline-variant/40 z-40">
        {/* Logo + user */}
        <div className="px-5 pt-6 pb-4">
          <div className="text-xl font-extrabold italic tracking-tight text-secondary mb-5">
            Pick <span className="text-orange-accent">&</span> Serve
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-secondary-container flex items-center justify-center text-sm font-bold text-on-surface-variant flex-shrink-0">
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-on-surface truncate">{user.name}</div>
              <div className="text-xs text-on-surface-variant">Jugador</div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 flex flex-col gap-1 px-2 mt-2">
          {navItems.map(item => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 ${
                  active
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
                {item.label}
                {item.id === 'notifications' && unread > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-4 pb-6">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            Salir
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ────────────────────── */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-surface-container border-b border-outline-variant/40 z-50 flex items-center justify-between px-4">
        <div className="text-base font-extrabold italic tracking-tight text-secondary">
          Pick <span className="text-orange-accent">&</span> Serve
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-on-surface-variant">{user.name.split(' ')[0]}</div>
          <button
            onClick={onLogout}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          </button>
        </div>
      </nav>

      {/* ── Main content ──────────────────────── */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 pb-24 lg:pb-8 min-h-screen">
        {/* Page header (desktop) */}
        <div className="hidden lg:flex items-end justify-between px-8 pt-8 pb-4 border-b border-outline-variant/20">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
              {pageTitles[tab]}
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Bienvenido, {user.name.split(' ')[0]}.
            </p>
          </div>
        </div>

        <div className="px-4 lg:px-8 pt-4 lg:pt-6">
          {tab === 'home'          && <Predictions userId={user.user_id} showToast={showToast} />}
          {tab === 'ranking'       && <Ranking />}
          {tab === 'notifications' && <Notifications userId={user.user_id} onUnreadChange={setUnread} />}
          {tab === 'stats'         && <Stats userId={user.user_id} />}
        </div>
      </main>

      {/* ── Mobile bottom nav ─────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[70px] bg-surface-container-highest border-t border-outline-variant/30 z-50 flex items-center justify-around px-2 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        {navItems.map(item => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`relative flex flex-col items-center gap-1 pt-1 pb-2 px-3 transition-all ${
                active ? 'text-secondary-container' : 'text-on-surface-variant'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: active ? 26 : 22,
                  fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
              {item.id === 'notifications' && unread > 0 && (
                <span className="absolute top-0 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
