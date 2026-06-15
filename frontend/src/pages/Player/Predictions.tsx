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
      const [r, p] = await Promise.all([
        api.getOpenRounds(),
        api.getMyPredictions(userId),
      ]);
      setRounds(r);
      setPredictions(p);
    } catch {
      showToast('Error cargando jornada', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getPrediction = (matchId: number) =>
    predictions.find(p => p.match_id === matchId);

  const handlePredict = async (matchId: number, winner: string) => {
    setSaving(matchId);
    try {
      const pred = await api.createPrediction(userId, matchId, winner);
      setPredictions(prev => {
        const filtered = prev.filter(p => p.match_id !== matchId);
        return [...filtered, pred];
      });
      showToast('¡Pronóstico guardado! 🎾');
    } catch (e: any) {
      showToast(e.message || 'Error guardando pronóstico', 'error');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /> Cargando jornadas...</div>;

  if (rounds.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🏟️</div>
        <div className="empty-state-text">No hay jornadas abiertas por ahora</div>
      </div>
    );
  }

  return (
    <div>
      {rounds.map(round => (
        <div key={round.id} style={{ marginBottom: 24 }}>
          <div className="tournament-header">
            <span className="tournament-icon">🎾</span>
            <div className="tournament-info">
              <div className="tournament-name">{round.tournament_name}</div>
              <div className="round-name">{round.name}</div>
            </div>
            <span className={`round-status ${round.status}`}>
              {round.status === 'open' ? 'ABIERTA' : 'CERRADA'}
            </span>
          </div>

          {round.matches.map(match => {
            const pred = getPrediction(match.id);
            const isSaving = saving === match.id;

            return (
              <div key={match.id} className={`match-card ${match.status === 'finished' ? 'finished' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {match.status === 'finished' ? '✅ Finalizado' : '⏳ Pendiente'}
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {match.is_final && <span className="final-badge">FINAL</span>}
                    {pred && (
                      <span className={`points-pill ${pred.points === null ? 'pending' : pred.points > 0 ? 'correct' : 'wrong'}`}>
                        {pred.points === null ? '—' : `+${pred.points} pts`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="match-players">
                  <div className={`player-name ${pred?.predicted_winner === 'player_a' ? 'predicted' : ''} ${match.winner_player_id === 'player_a' ? 'winner' : ''}`}>
                    {match.player_a}
                  </div>
                  <div className="vs-badge">VS</div>
                  <div className={`player-name ${pred?.predicted_winner === 'player_b' ? 'predicted' : ''} ${match.winner_player_id === 'player_b' ? 'winner' : ''}`} style={{ textAlign: 'right' }}>
                    {match.player_b}
                  </div>
                </div>

                {match.status === 'pending' && round.status === 'open' && (
                  <div className="prediction-buttons">
                    <button
                      className={`prediction-btn ${pred?.predicted_winner === 'player_a' ? 'selected' : ''}`}
                      onClick={() => handlePredict(match.id, 'player_a')}
                      disabled={isSaving}
                    >
                      {isSaving && pred?.predicted_winner !== 'player_a' ? '...' : '← Gana este'}
                    </button>
                    <button
                      className={`prediction-btn ${pred?.predicted_winner === 'player_b' ? 'selected' : ''}`}
                      onClick={() => handlePredict(match.id, 'player_b')}
                      disabled={isSaving}
                    >
                      {isSaving && pred?.predicted_winner !== 'player_b' ? '...' : 'Gana este →'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
