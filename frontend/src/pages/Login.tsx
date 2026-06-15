import { useEffect, useState } from 'react';
import { api } from '../api';
import type { AuthUser, User } from '../types';

interface Props {
  onLogin: (user: AuthUser) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function Login({ onLogin, showToast }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState<number | null>(null);

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => showToast('No se pudo cargar usuarios', 'error')).finally(() => setLoading(false));
  }, []);

  const handleLogin = async (userId: number) => {
    setLogging(userId);
    try {
      const u = await api.login(userId);
      onLogin(u);
    } catch {
      showToast('Error al iniciar sesión', 'error');
    } finally {
      setLogging(null);
    }
  };

  const avatars = ['🎾', '🏆', '🎯', '⚡', '🌟', '🔥', '🎪', '💎', '🚀', '🎭'];

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">🎾</span>
          <div className="login-logo-name">Pick <span>&</span> Serve</div>
          <div className="login-logo-sub">Liga ATP · Pronósticos</div>
        </div>

        <div className="card">
          <p className="section-title">Seleccioná tu usuario</p>

          {loading ? (
            <div className="loading">
              <div className="spinner" />
              Cargando...
            </div>
          ) : (
            <div className="user-select-list">
              {users.map((u, i) => (
                <button
                  key={u.id}
                  className="user-select-btn"
                  onClick={() => handleLogin(u.id)}
                  disabled={logging !== null}
                >
                  <div className="user-avatar">{avatars[i % avatars.length]}</div>
                  <div className="user-info">
                    <div className="user-name">{u.name}</div>
                    <div className="user-role">{u.email}</div>
                  </div>
                  {u.is_admin && <span className="admin-badge">ADMIN</span>}
                  {logging === u.id && <div className="spinner" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
          PoC · Ingeniería de Software II
        </p>
      </div>
    </div>
  );
}
