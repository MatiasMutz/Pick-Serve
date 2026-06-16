import { useEffect, useState, useRef } from 'react';
import { api } from '../../api';
import type { RankingEntry } from '../../types';

const POLL = 5000;

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

const podiumColors = [
  { border: 'border-secondary-container', text: 'text-secondary-container', bg: 'from-secondary-container/80 to-orange-accent/60' },
  { border: 'border-[#c0c0c0]', text: 'text-[#c0c0c0]', bg: 'from-[#c0c0c0]/80 to-[#707070]/60' },
  { border: 'border-[#cd7f32]', text: 'text-[#cd7f32]', bg: 'from-[#cd7f32]/80 to-[#8b4513]/60' },
];

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

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-on-surface-variant text-sm">
        <div className="spinner" /> Cargando ranking...
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant text-sm gap-3">
        <span className="material-symbols-outlined opacity-30" style={{ fontSize: 48 }}>emoji_events</span>
        El ranking se actualiza cuando el admin carga resultados
      </div>
    );
  }

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-on-surface">Clasificación General</h2>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <div className="live-dot" />
          {lastTs
            ? lastTs.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : 'Actualizando...'}
        </div>
      </div>

      {/* Podium (top 3) */}
      {top3.length >= 2 && (
        <div className="flex justify-center items-end gap-3 h-44 px-4">
          {podiumOrder.map((entry, i) => {
            if (!entry) return null;
            const pos = entry.position ?? i + 1;
            const isFirst = pos === 1;
            const colorIdx = pos - 1;
            const colors = podiumColors[colorIdx] ?? podiumColors[2];
            const heights = { 1: 'h-28', 2: 'h-20', 3: 'h-16' };
            const barH = heights[pos as 1 | 2 | 3] ?? 'h-16';
            const avatarSize = isFirst ? 'w-14 h-14 border-4' : 'w-11 h-11 border-2';
            const crownVisible = isFirst;

            return (
              <div key={entry.user_id} className="flex flex-col items-center w-1/3 relative">
                {crownVisible && (
                  <span className="material-symbols-outlined text-secondary-container absolute -top-6 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    crown
                  </span>
                )}
                <div className={`rounded-full ${avatarSize} ${colors.border} bg-surface-container-high flex items-center justify-center text-sm font-bold text-on-surface-variant mb-1`}>
                  {initials(entry.user_name)}
                </div>
                <div className="text-xs font-bold text-on-surface mb-1 truncate max-w-full px-1 text-center">
                  {entry.user_name.split(' ')[0]}
                </div>
                <div className={`w-full bg-gradient-to-b ${colors.bg} rounded-t-lg flex items-center justify-center ${barH}`}>
                  <span className="text-lg font-bold text-black/40">{pos}</span>
                </div>
                <div className="bg-surface-container-high w-full text-center py-1 rounded-b-sm border-t border-surface">
                  <span className={`text-sm font-bold ${colors.text}`}>{entry.total_points}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden">
        {ranking.map((entry, idx) => {
          const pos = entry.position ?? idx + 1;
          const posColors: Record<number, string> = {
            1: 'text-yellow-400 text-base',
            2: 'text-[#c0c0c0]',
            3: 'text-[#cd7f32]',
          };
          return (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 px-4 py-3 border-b border-outline-variant/20 last:border-0 ${
                pos <= 3 ? 'bg-surface-container-high/40' : ''
              }`}
            >
              <div className={`w-7 text-center text-sm font-bold text-on-surface-variant flex-shrink-0 ${posColors[pos] ?? ''}`}>
                {pos <= 3 ? `#${pos}` : pos}
              </div>
              <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center text-xs font-bold text-on-surface-variant flex-shrink-0">
                {initials(entry.user_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-on-surface">{entry.user_name}</div>
                <div className="text-xs text-on-surface-variant mt-0.5">
                  {entry.correct_predictions}/{entry.total_predictions} correctos
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-orange-accent">{entry.total_points}</div>
                <div className="text-xs text-on-surface-variant">pts</div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-on-surface-variant">
        Actualización automática cada 5 segundos
      </p>
    </div>
  );
}
