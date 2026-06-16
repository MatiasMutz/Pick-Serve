import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Prediction, RankingEntry } from '../../types';

interface Props { userId: number; }

// Simple SVG ring/donut chart for accuracy
function RingChart({ value, size = 110 }: { value: number; size?: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface2)" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke="var(--accent)" strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="50" y="54" textAnchor="middle" fill="var(--text)"
        fontSize="18" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
        {value}%
      </text>
    </svg>
  );
}

export default function Stats({ userId }: Props) {
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [entry, setEntry] = useState<RankingEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMyPredictions(userId), api.getRanking()])
      .then(([p, r]) => {
        setPreds(p);
        setEntry(r.find(e => e.user_id === userId) ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /> Cargando...</div>;

  const scored   = preds.filter(p => p.points !== null);
  const correct  = scored.filter(p => (p.points ?? 0) > 0).length;
  const accuracy = scored.length ? Math.round((correct / scored.length) * 100) : 0;

  return (
    <div>
      <p className="label">Mis estadísticas</p>

      {/* Accuracy ring + summary */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="ring-container">
          <RingChart value={accuracy} />
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Precision general</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Total predicciones: <strong style={{ color: 'var(--text)' }}>{preds.length}</strong>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Puntos totales: <strong style={{ color: 'var(--accent)' }}>{entry?.total_points ?? 0}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-val">{entry?.total_points ?? 0}</div>
          <div className="stat-label">Puntos</div>
        </div>
        <div className="stat-box">
          <div className="stat-val">{entry?.position ? `#${entry.position}` : '—'}</div>
          <div className="stat-label">Posicion</div>
        </div>
        <div className="stat-box">
          <div className="stat-val">{correct}</div>
          <div className="stat-label">Aciertos</div>
        </div>
        <div className="stat-box">
          <div className="stat-val">{scored.length}</div>
          <div className="stat-label">Evaluados</div>
        </div>
      </div>

      <p className="label">Historial</p>
      <div className="card">
        {preds.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No hay pronósticos registrados
          </div>
        ) : preds.map(p => (
          <div key={p.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 16px', borderBottom: '1px solid var(--border)'
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Partido #{p.match_id} &mdash;{' '}
              <span style={{ color: 'var(--text)' }}>
                {p.predicted_winner === 'player_a' ? 'Jugador A' : 'Jugador B'}
              </span>
            </span>
            <span className={`pts-badge ${p.points === null ? 'pending' : p.points > 0 ? 'correct' : 'wrong'}`}>
              {p.points === null ? 'Pendiente' : p.points > 0 ? `+${p.points}` : '0'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
