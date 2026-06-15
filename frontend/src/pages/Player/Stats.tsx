import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Prediction, RankingEntry } from '../../types';

interface Props { userId: number; }

export default function Stats({ userId }: Props) {
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [ranking, setRanking] = useState<RankingEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMyPredictions(userId), api.getRanking()])
      .then(([p, r]) => {
        setPreds(p);
        setRanking(r.find(e => e.user_id === userId) ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /> Cargando...</div>;

  const scored = preds.filter(p => p.points !== null);
  const correct = scored.filter(p => (p.points ?? 0) > 0).length;
  const accuracy = scored.length ? Math.round((correct / scored.length) * 100) : 0;

  return (
    <div>
      <p className="section-title">Mis Estadísticas</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{ranking?.total_points ?? 0}</div>
          <div className="stat-label">Puntos totales</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{ranking?.position ? `#${ranking.position}` : '—'}</div>
          <div className="stat-label">Posición</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{correct}</div>
          <div className="stat-label">Aciertos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{accuracy}%</div>
          <div className="stat-label">Precisión</div>
        </div>
      </div>

      <p className="section-title">Mis Pronósticos</p>
      <div className="card">
        {preds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 13 }}>
            Aún no tenés pronósticos cargados
          </div>
        ) : preds.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Partido #{p.match_id} → <strong style={{ color: 'var(--text)' }}>{p.predicted_winner === 'player_a' ? 'Jugador A' : 'Jugador B'}</strong>
            </span>
            <span className={`points-pill ${p.points === null ? 'pending' : p.points > 0 ? 'correct' : 'wrong'}`}>
              {p.points === null ? 'Pendiente' : p.points > 0 ? `+${p.points} ✅` : '0 ❌'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
