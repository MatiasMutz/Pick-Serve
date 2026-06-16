import { useEffect, useState } from 'react';
import { api } from '../api';
import type { AuthUser, User } from '../types';
import { IconShield } from '../components/Icons';

interface Props {
  onLogin: (user: AuthUser) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export default function Login({ onLogin, showToast }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState<number | null>(null);

  useEffect(() => {
    api.getUsers()
      .then(setUsers)
      .catch(() => showToast('No se pudo conectar con el servidor', 'error'))
      .finally(() => setLoading(false));
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

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <IconShield size={28} />
          </div>
          <div className="login-brand-name">Pick <span>&</span> Serve</div>
          <div className="login-brand-sub">Liga ATP · Pronósticos</div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <p className="label">Seleccionar cuenta</p>

          {loading ? (
            <div className="loading"><div className="spinner" /> Cargando...</div>
          ) : (
            <div className="user-list">
              {users.map(u => (
                <button
                  key={u.id}
                  className="user-btn"
                  onClick={() => handleLogin(u.id)}
                  disabled={logging !== null}
                >
                  <div className="user-avatar-sm">{initials(u.name)}</div>
                  <div className="user-btn-info">
                    <div className="user-btn-name">{u.name}</div>
                    <div className="user-btn-email">{u.email}</div>
                  </div>
                  {u.is_admin && <span className="admin-tag">ADMIN</span>}
                  {logging === u.id && <div className="spinner" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>
          Ingeniería de Software II · PoC
        </p>
      </div>
    </div>
  );
}
