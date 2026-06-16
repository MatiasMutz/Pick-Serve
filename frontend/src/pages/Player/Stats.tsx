import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Prediction, RankingEntry } from '../../types';

interface Props { userId: number; }

function RingChart({ value, size = 120 }: { value: number; size?: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#272a2c" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke="#FF5C00" strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="50" y="55" textAnchor="middle" fill="#e0e3e5"
        fontSize="17" fontWeight="800" fontFamily="Inter, system-ui, sans-serif">
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

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-on-surface-variant text-sm">
        <div className="spinner" /> Cargando...
      </div>
    );
  }

  const scored  = preds.filter(p => p.points !== null);
  const correct = scored.filter(p => (p.points ?? 0) > 0).length;
  const accuracy = scored.length ? Math.round((correct / scored.length) * 100) : 0;

  const statBoxes = [
    { label: 'Puntos totales', value: entry?.total_points ?? 0, accent: true },
    { label: 'Posición global', value: entry?.position ? `#${entry.position}` : '—', accent: false },
    { label: 'Aciertos', value: correct, accent: false },
    { label: 'Evaluados', value: scored.length, accent: false },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Performance header */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-5">
        <p className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-4">
          Performance Metrics
        </p>
        <div className="flex items-center gap-6">
          <RingChart value={accuracy} />
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-xs text-on-surface-variant mb-0.5">Precisión general</div>
              <div className="text-2xl font-extrabold text-orange-accent">{accuracy}%</div>
            </div>
            <div className="text-xs text-on-surface-variant">
              Total picks: <span className="text-on-surface font-semibold">{preds.length}</span>
            </div>
            <div className="text-xs text-on-surface-variant">
              Puntos: <span className="text-orange-accent font-bold">{entry?.total_points ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {statBoxes.map(box => (
          <div key={box.label} className="bg-surface-container border border-outline-variant/30 rounded-xl p-4">
            <div className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-2">
              {box.label}
            </div>
            <div className={`text-3xl font-extrabold leading-none ${box.accent ? 'text-orange-accent' : 'text-on-surface'}`}>
              {box.value}
            </div>
          </div>
        ))}
      </div>

      {/* History */}
      <div>
        <p className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mb-3">
          Historial
        </p>
        <div className="bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden">
          {preds.length === 0 ? (
            <div className="py-10 text-center text-sm text-on-surface-variant">
              No hay pronósticos registrados
            </div>
          ) : preds.map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20 last:border-0">
              <div className="text-sm text-on-surface-variant">
                Partido #{p.match_id}
                <span className="text-on-surface ml-2 font-medium">
                  — {p.predicted_winner === 'player_a' ? 'Jugador A' : 'Jugador B'}
                </span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                p.points === null
                  ? 'bg-surface-container-high text-on-surface-variant'
                  : p.points > 0
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-red-500/10 text-red-400'
              }`}>
                {p.points === null ? 'Pendiente' : p.points > 0 ? `+${p.points}` : '0'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
