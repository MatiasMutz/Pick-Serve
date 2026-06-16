import { useEffect, useState, useRef } from 'react';
import { api } from '../../api';
import type { RankingEntry } from '../../types';
import { IconArrowUp, IconArrowDown, IconRefresh } from '../../components/Icons';

const POLL = 5000;

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function posLabel(pos: number | null) {
  if (pos === 1) return '#1';
  if (pos === 2) return '#2';
  if (pos === 3) return '#3';
  return pos ? `#${pos}` : '—';
}

export default function Ranking() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastTs, setLastTs] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>();

  const load = async () => {
    try {
      setRanking(await api.getRanking());
      setLastTs(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    timer.current = setInterval(load, POLL);
    return () => clearInterval(timer.current);
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /> Cargando ranking...</div>;

  return (
    <div>
      <div className="refresh-row">
        <p className="label" style={{ margin: 0 }}>Clasificación General</p>
        <div className="refresh-label">
          <div className="live-dot" />
          {lastTs ? lastTs.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Actualizando'}
        </div>
      </div>

      {ranking.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M6 9H2V4h4m12 5h4V4h-4M6 9a6 6 0 0012 0" />
            </svg>
          </div>
          El ranking se actualiza cuando el admin carga resultados
        </div>
      ) : (
        <div className="card">
          {ranking.map(entry => (
            <div key={entry.user_id} className="ranking-row">
              <div className={`rank-pos ${entry.position === 1 ? 'p1' : entry.position === 2 ? 'p2' : entry.position === 3 ? 'p3' : ''}`}>
                {posLabel(entry.position)}
              </div>
              <div className="rank-avatar">{initials(entry.user_name)}</div>
              <div className="rank-info">
                <div className="rank-name">{entry.user_name}</div>
                <div className="rank-sub">{entry.correct_predictions}/{entry.total_predictions} correctos</div>
              </div>
              <div className="rank-right">
                <div className="rank-pts">{entry.total_points}</div>
                <div className="rank-trend">
                  {entry.total_points > 0
                    ? <span className="trend-up"><IconArrowUp size={12} /></span>
                    : <span className="trend-same">—</span>
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
        Actualización automática cada 5 segundos
      </p>
    </div>
  );
}
