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

  if (loading) return <div className="loading"><div className="spinner" /> Cargando...</div>;

  if (rounds.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        No hay jornadas abiertas en este momento
      </div>
    );
  }

  return (
    <div>
      {rounds.map(round => (
        <div key={round.id} style={{ marginBottom: 24 }}>
          <div className="round-header">
            <div className="round-header-left">
              <div className="round-tournament">{round.tournament_name}</div>
              <div className="round-name">{round.name}</div>
            </div>
            <span className={`pill pill-${round.status}`}>
              <span className="pill-dot" />
              {round.status === 'open' ? 'Activa' : 'Cerrada'}
            </span>
          </div>

          {round.matches.map(match => {
            const pred = getPred(match.id);
            const isSaving = saving === match.id;
            const finished = match.status === 'finished';

            return (
              <div key={match.id} className="match-card">
                <div className="match-meta">
                  <span className="match-status-text">
                    {finished ? 'Finalizado' : 'Pendiente'}
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {match.is_final && <span className="final-tag">FINAL +2</span>}
                    {pred && pred.points !== null && (
                      <span className={`pts-badge ${pred.points > 0 ? 'correct' : 'wrong'}`}>
                        {pred.points > 0 ? `+${pred.points} pts` : '0 pts'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="match-options">
                  {(['player_a', 'player_b'] as const).map(side => {
                    const playerName = side === 'player_a' ? match.player_a : match.player_b;
                    const isSelected = pred?.predicted_winner === side;
                    const isWinner   = match.winner_player_id === side;
                    const isLoser    = finished && match.winner_player_id && match.winner_player_id !== side;

                    return (
                      <button
                        key={side}
                        className="match-option"
                        onClick={() => !finished && round.status === 'open' && handlePredict(match.id, side)}
                        disabled={finished || round.status === 'closed' || isSaving}
                      >
                        <div className={`radio-circle ${isWinner ? 'winner' : isSelected ? 'selected' : ''}`} />
                        <span className={`option-name ${isWinner ? 'winner' : isSelected ? 'selected' : isLoser ? 'loser' : ''}`}>
                          {playerName}
                        </span>
                        {isSaving && isSelected && <div className="spinner" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
