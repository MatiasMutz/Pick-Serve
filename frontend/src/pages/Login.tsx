import { useEffect, useState } from 'react';
import { api } from '../api';
import type { AuthUser, User } from '../types';

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
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-8">
      {/* Brand */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-orange-accent/10 border border-orange-accent/30 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-orange-accent" style={{ fontSize: 28 }}>sports_tennis</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
          Pick <span className="text-orange-accent">&</span> Serve
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">Liga ATP · Pronósticos</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className="bg-surface-container border border-outline-variant/40 rounded-xl p-5">
          <p className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-4">
            Seleccionar cuenta
          </p>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-on-surface-variant text-sm">
              <div className="spinner" /> Cargando...
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleLogin(u.id)}
                  disabled={logging !== null}
                  className="w-full flex items-center gap-3 p-3 bg-surface border border-outline-variant/30 rounded-xl text-left transition-all hover:bg-surface-container-high hover:border-outline-variant disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-9 h-9 rounded-xl bg-surface-container-high border border-outline-variant/50 flex items-center justify-center text-xs font-bold text-on-surface-variant flex-shrink-0">
                    {initials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-on-surface">{u.name}</div>
                    <div className="text-xs text-on-surface-variant truncate mt-0.5">{u.email}</div>
                  </div>
                  {u.is_admin && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-accent/10 text-orange-accent tracking-wide">
                      ADMIN
                    </span>
                  )}
                  {logging === u.id && <div className="spinner" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-5">
          Ingeniería de Software II · PoC
        </p>
      </div>
    </div>
  );
}
