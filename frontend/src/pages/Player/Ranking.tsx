import { useEffect, useState, useRef } from 'react';
import { api } from '../../api';
import type { RankingEntry } from '../../types';

const POLL_INTERVAL = 5000;

export default function Ranking() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const load = async () => {
    try {
      const r = await api.getRanking();
      setRanking(r);
      setLastUpdated(new Date());
    } catch {
      // silent refresh errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, []);

  const posIcon = (pos: number | null) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return pos ?? '—';
  };

  const posClass = (pos: number | null) => {
    if (pos === 1) return 'top1';
    if (pos === 2) return 'top2';
    if (pos === 3) return 'top3';
    return '';
  };

  if (loading) return <div className="loading"><div className="spinner" /> Cargando ranking...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="section-title" style={{ margin: 0 }}>Ranking Global</span>
        <div className="refresh-indicator">
          <div className="refresh-dot" />
          {lastUpdated ? `Actualizado ${lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Actualizando...'}
        </div>
      </div>

      {ranking.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏆</div>
          <div className="empty-state-text">Aún no hay puntos acumulados</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            El ranking se actualiza cuando el admin carga resultados
          </div>
        </div>
      ) : (
        <div className="card">
          {ranking.map((entry, i) => (
            <div key={entry.user_id} className="ranking-row">
              <div className={`ranking-pos ${posClass(entry.position)}`}>
                {posIcon(entry.position)}
              </div>
              <div className="ranking-name">{entry.user_name}</div>
              <div style={{ textAlign: 'right' }}>
                <div className="ranking-pts">{entry.total_points} pts</div>
                <div className="ranking-acc">
                  {entry.correct_predictions}/{entry.total_predictions} ✓
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
        Se refresca automáticamente cada 5 segundos
      </p>
    </div>
  );
}
