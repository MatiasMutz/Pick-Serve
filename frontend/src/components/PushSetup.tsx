import { useEffect, useState } from 'react';
import {
  hasActivePushSubscription,
  isIOS,
  isPushSupported,
  isStandalonePWA,
  subscribeToPush,
} from '../push';

interface Props {
  userId: number;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function PushSetup({ userId, showToast }: Props) {
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [activating, setActivating] = useState(false);

  const ios = isIOS();
  const standalone = isStandalonePWA();
  const supported = isPushSupported();

  useEffect(() => {
    hasActivePushSubscription()
      .then(setSubscribed)
      .finally(() => setLoading(false));
  }, []);

  const handleActivate = async () => {
    setActivating(true);
    try {
      await subscribeToPush(userId);
      setSubscribed(true);
      showToast('Notificaciones push activadas');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'No se pudieron activar las notificaciones';
      showToast(message, 'error');
    } finally {
      setActivating(false);
    }
  };

  if (loading || !supported) return null;
  if (subscribed) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-green-400 flex-shrink-0" style={{ fontSize: 20 }}>
          notifications_active
        </span>
        <div>
          <div className="text-sm font-bold text-green-400">Notificaciones push activas</div>
          <div className="text-xs text-on-surface-variant mt-1">
            Vas a recibir alertas del sistema cuando haya resultados o jornadas cerradas.
          </div>
        </div>
      </div>
    );
  }

  if (ios && !standalone) {
    return (
      <div className="bg-orange-accent/10 border border-orange-accent/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-orange-accent flex-shrink-0" style={{ fontSize: 20 }}>
            install_mobile
          </span>
          <div>
            <div className="text-sm font-bold text-on-surface">Instalá la app primero</div>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              En Safari, tocá <strong className="text-on-surface">Compartir</strong> →{' '}
              <strong className="text-on-surface">Agregar a pantalla de inicio</strong>.
              Las push en iOS solo funcionan desde la app instalada (iOS 16.4+).
            </p>
            <p className="text-xs text-on-surface-variant mt-2">
              Usá <strong className="text-on-surface">https://</strong> (puerto 3443), no http.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-orange-accent flex-shrink-0" style={{ fontSize: 20 }}>
          notifications
        </span>
        <div className="flex-1">
          <div className="text-sm font-bold text-on-surface">Activar notificaciones push</div>
          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
            Recibí alertas en tu celular cuando se carguen resultados o se cierre una jornada.
          </p>
          <button
            onClick={handleActivate}
            disabled={activating}
            className="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-orange-accent text-white hover:bg-orange-accent/90 transition-colors disabled:opacity-50"
          >
            {activating ? 'Activando...' : 'Activar notificaciones'}
          </button>
        </div>
      </div>
    </div>
  );
}
