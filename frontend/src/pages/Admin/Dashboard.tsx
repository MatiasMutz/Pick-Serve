import { useState, useEffect } from 'react';
import { api } from '../../api';
import type { AuthUser, Round } from '../../types';
import { IconLock, IconLogout } from '../../components/Icons';

interface Props {
  user: AuthUser;
  onLogout: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function AdminDashboard({ user, onLogout, showToast }: Props) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = async () => {
    try {
      setRounds(await api.getOpenRounds());
    } catch {
      showToast('Error cargando datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleResult = async (matchId: number, winner: string) => {
    const key = `m${matchId}`;
    setProcessing(key);
    try {
      await api.loadResult(matchId, winner);
      showToast('Resultado cargado — evento publicado en RabbitMQ');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Error', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleCloseRound = async (roundId: number) => {
    const key = `r${roundId}`;
    setProcessing(key);
    try {
      await api.closeRound(roundId);
      showToast('Jornada cerrada — notificaciones enviadas');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Error', 'error');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="app-shell">
      <div className="topbar">
        <div>
          <div className="topbar-logo">Pick <span>&</span> Serve</div>
          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginTop: 1 }}>Panel de Administracion</div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>
            <IconLogout size={14} /> Salir
          </button>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        {/* Event architecture info */}
        <div className="event-info-card">
          <div className="event-info-title">Arquitectura de eventos</div>
          <div className="event-info-text">
            Al cargar un resultado se publica{' '}
            <span className="event-code">match.result.loaded</span> en el exchange topic de RabbitMQ.
            Tres workers lo consumen en paralelo: scoring, notifications y el encadenamiento hacia ranking via{' '}
            <span className="event-code">scores.updated</span>.
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Cargando...</div>
        ) : rounds.length === 0 ? (
          <div className="empty">No hay jornadas abiertas</div>
        ) : (
          rounds.map(round => (
            <div key={round.id} style={{ marginBottom: 24 }}>
              <div className="round-header">
                <div className="round-header-left">
                  <div className="round-tournament">{round.tournament_name}</div>
                  <div className="round-name">{round.name}</div>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleCloseRound(round.id)}
                  disabled={processing === `r${round.id}`}
                >
                  {processing === `r${round.id}` ? (
                    <><div className="spinner" /> Cerrando...</>
                  ) : (
                    <><IconLock size={13} /> Cerrar</>
                  )}
                </button>
              </div>

              {round.matches.map(match => (
                <div key={match.id} className="admin-match-card">
                  <div className="admin-match-header">
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {match.player_a} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs</span> {match.player_b}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Partido #{match.id}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {match.is_final && <span className="final-tag">FINAL +2</span>}
                      <span className={`pill ${match.status === 'finished' ? 'pill-open' : 'pill-pending'}`}>
                        {match.status === 'finished' ? 'Finalizado' : 'Pendiente'}
                      </span>
                    </div>
                  </div>

                  {match.status === 'pending' && (
                    <div className="admin-result-btns">
                      <button
                        className={`result-btn ${match.winner_player_id === 'player_a' ? 'winner' : ''}`}
                        onClick={() => handleResult(match.id, 'player_a')}
                        disabled={processing === `m${match.id}`}
                      >
                        {processing === `m${match.id}` ? 'Procesando...' : `Gano ${match.player_a}`}
                      </button>
                      <button
                        className={`result-btn ${match.winner_player_id === 'player_b' ? 'winner' : ''}`}
                        onClick={() => handleResult(match.id, 'player_b')}
                        disabled={processing === `m${match.id}`}
                      >
                        {processing === `m${match.id}` ? 'Procesando...' : `Gano ${match.player_b}`}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
