import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Round, Prediction } from '../../types';

interface Props {
  userId: number;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function Predictions({ userId, showToast }: Props) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const load = async () => {
    try {
      const [r, p] = await Promise.all([api.getOpenRounds(), api.getMyPredictions(userId)]);
      setRounds(r);
      setPredictions(p);
    } catch {
      showToast('Error cargando jornada', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getPred = (matchId: number) => predictions.find(p => p.match_id === matchId);

  const handlePredict = async (matchId: number, winner: string) => {
    setSaving(matchId);
    try {
      const pred = await api.createPrediction(userId, matchId, winner);
      setPredictions(prev => [...prev.filter(p => p.match_id !== matchId), pred]);
      showToast('Pronóstico guardado');
    } catch (e: any) {
      showToast(e.message || 'Error guardando pronóstico', 'error');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-on-surface-variant text-sm">
        <div className="spinner" /> Cargando...
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant text-sm gap-3">
        <span className="material-symbols-outlined opacity-30" style={{ fontSize: 48 }}>sports_tennis</span>
        No hay jornadas abiertas en este momento
      </div>
    );
  }

  const totalMatches = rounds.reduce((acc, r) => acc + r.matches.length, 0);
  const filled = predictions.filter(p => rounds.some(r => r.matches.some(m => m.id === p.match_id))).length;
  const progress = totalMatches ? Math.round((filled / totalMatches) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Progress bar */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">Completados</span>
          <span className="text-base font-bold text-secondary-container">
            {filled} <span className="text-on-surface-variant font-normal text-sm">/ {totalMatches}</span>
          </span>
        </div>
        <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
          <div
            className="h-full bg-secondary-container rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {rounds.map(round => (
        <div key={round.id}>
          {/* Round header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-bold text-orange-accent tracking-wide uppercase">{round.tournament_name}</div>
              <div className="text-base font-bold text-on-surface">{round.name}</div>
            </div>
            <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
              round.status === 'open'
                ? 'bg-green-500/10 text-green-400'
                : 'bg-red-500/10 text-red-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${round.status === 'open' ? 'bg-green-400' : 'bg-red-400'}`} />
              {round.status === 'open' ? 'Activa' : 'Cerrada'}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {round.matches.map(match => {
              const pred = getPred(match.id);
              const isSaving = saving === match.id;
              const finished = match.status === 'finished';
              const locked = finished || round.status === 'closed';

              return (
                <article
                  key={match.id}
                  className={`bg-surface-container border rounded-xl overflow-hidden transition-all ${
                    locked ? 'border-outline-variant/20 opacity-80' : 'border-outline-variant/40 hover:border-outline-variant'
                  }`}
                >
                  {/* Match meta */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <div className="flex items-center gap-2">
                      {locked && (
                        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 14 }}>lock</span>
                      )}
                      <span className="text-xs text-on-surface-variant">
                        {finished ? 'Finalizado' : 'Pendiente'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {match.is_final && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 tracking-wide">
                          FINAL +2
                        </span>
                      )}
                      {pred && pred.points !== null && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          pred.points > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {pred.points > 0 ? `+${pred.points} pts` : '0 pts'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Player options */}
                  {(['player_a', 'player_b'] as const).map((side, idx) => {
                    const playerName = side === 'player_a' ? match.player_a : match.player_b;
                    const isSelected = pred?.predicted_winner === side;
                    const isWinner   = match.winner_player_id === side;
                    const isLoser    = finished && match.winner_player_id && match.winner_player_id !== side;

                    return (
                      <button
                        key={side}
                        onClick={() => !locked && !isSaving && handlePredict(match.id, side)}
                        disabled={locked || isSaving}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-t border-outline-variant/20 ${
                          locked ? 'cursor-default' : 'hover:bg-surface-container-high cursor-pointer'
                        }`}
                      >
                        {/* Radio circle */}
                        <div className={`w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          isWinner
                            ? 'border-green-400 bg-green-400'
                            : isSelected
                            ? 'border-orange-accent bg-orange-accent'
                            : 'border-outline-variant'
                        }`}>
                          {(isWinner || isSelected) && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>

                        <span className={`flex-1 text-sm font-medium ${
                          isWinner ? 'text-green-400 font-semibold'
                          : isSelected ? 'text-orange-accent font-semibold'
                          : isLoser ? 'text-on-surface-variant'
                          : 'text-on-surface'
                        }`}>
                          {playerName}
                        </span>

                        {isSaving && isSelected && <div className="spinner" />}
                      </button>
                    );
                  })}
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
