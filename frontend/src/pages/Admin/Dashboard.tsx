import { useState, useEffect } from 'react';
import { api } from '../../api';
import type { AuthUser, Match, Round } from '../../types';

interface Props {
  user: AuthUser;
  onLogout: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function AdminDashboard({ user, onLogout, showToast }: Props) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const load = async () => {
    try {
      const r = await api.getOpenRounds();
      setRounds(r);
    } catch {
      showToast('Error cargando partidos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleResult = async (matchId: number, winner: string) => {
    setProcessing(matchId);
    try {
      await api.loadResult(matchId, winner);
      showToast('✅ Resultado cargado · evento pub/sub disparado!');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Error', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleCloseRound = async (roundId: number) => {
    setProcessing(-roundId);
    try {
      await api.closeRound(roundId);
      showToast('🔒 Jornada cerrada · notificaciones enviadas!');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Error', 'error');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <>
      <div className="app-container">
        <div className="header">
          <div className="header-logo">Pick <span style={{ color: 'var(--accent)' }}>&</span> Serve <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginLeft: 4 }}>ADMIN</span></div>
          <button className="btn btn-secondary btn-sm" onClick={onLogout}>Salir</button>
        </div>

        {/* Event architecture info */}
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(201,241,53,0.2)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🔌 Arquitectura de Eventos
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Al cargar un resultado → se publica <code style={{ color: 'var(--accent)', background: 'rgba(201,241,53,0.1)', padding: '1px 4px', borderRadius: 3 }}>match.result.loaded</code> → fan-out a 3 workers en paralelo → scoring-worker publica <code style={{ color: 'var(--accent)', background: 'rgba(201,241,53,0.1)', padding: '1px 4px', borderRadius: 3 }}>scores.updated</code> → ranking-worker recalcula posiciones.
          </p>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Cargando...</div>
        ) : rounds.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏟️</div>
            <div className="empty-state-text">No hay jornadas abiertas</div>
          </div>
        ) : (
          rounds.map(round => (
            <div key={round.id} style={{ marginBottom: 24 }}>
              <div className="tournament-header">
                <span className="tournament-icon">🎾</span>
                <div className="tournament-info">
                  <div className="tournament-name">{round.tournament_name}</div>
                  <div className="round-name">{round.name}</div>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleCloseRound(round.id)}
                  disabled={processing === -round.id}
                >
                  {processing === -round.id ? '⏳' : '🔒 Cerrar'}
                </button>
              </div>

              {round.matches.map(match => (
                <div key={match.id} className="admin-match-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Partido #{match.id}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {match.is_final && <span className="final-badge">FINAL +2 bonus</span>}
                      <span style={{ fontSize: 11, color: match.status === 'finished' ? 'var(--success)' : 'var(--text-muted)' }}>
                        {match.status === 'finished' ? '✅ Finalizado' : '⏳ Pendiente'}
                      </span>
                    </div>
                  </div>

                  <div className="match-players" style={{ marginBottom: 0 }}>
                    <div className={`player-name ${match.winner_player_id === 'player_a' ? 'winner' : ''}`}>
                      {match.player_a}
                    </div>
                    <div className="vs-badge">VS</div>
                    <div className={`player-name ${match.winner_player_id === 'player_b' ? 'winner' : ''}`} style={{ textAlign: 'right' }}>
                      {match.player_b}
                    </div>
                  </div>

                  {match.status === 'pending' && (
                    <div className="admin-result-btns">
                      <button
                        className="result-btn"
                        onClick={() => handleResult(match.id, 'player_a')}
                        disabled={processing === match.id}
                      >
                        {processing === match.id ? '⏳ Procesando...' : '← Ganó este'}
                      </button>
                      <button
                        className="result-btn"
                        onClick={() => handleResult(match.id, 'player_b')}
                        disabled={processing === match.id}
                      >
                        {processing === match.id ? '⏳ Procesando...' : 'Ganó este →'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}

        <div style={{ height: 20 }} />
      </div>
    </>
  );
}
