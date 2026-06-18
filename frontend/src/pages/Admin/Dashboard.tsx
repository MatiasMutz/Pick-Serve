import { useState, useEffect } from 'react';
import { api } from '../../api';
import type { AuthUser, Round } from '../../types';

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

  const handleResetDemo = async () => {
    if (!window.confirm('¿Crear un nuevo torneo demo? Solo funciona si no hay jornadas abiertas.')) return;
    setProcessing('reset');
    try {
      const result = await api.resetDemo();
      if (result.skipped) {
        showToast(result.reason ?? 'No se pudo resetear la demo', 'error');
      } else {
        showToast(`Demo creada: ${result.tournament} (${result.matches} partidos)`);
        await load();
      }
    } catch (e: any) {
      showToast(e.message || 'Error', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const totalMatches = rounds.reduce((acc, r) => acc + r.matches.length, 0);
  const pendingMatches = rounds.reduce((acc, r) => acc + r.matches.filter(m => m.status === 'pending').length, 0);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex">

      {/* ── Sidebar ───────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-0 h-full bg-surface-container-low border-r border-outline-variant/40 z-40">
        <div className="px-5 pt-6 pb-4">
          <div className="text-xl font-extrabold italic tracking-tight text-secondary mb-1">
            Pick <span className="text-orange-accent">&</span> Serve
          </div>
          <div className="text-xs font-bold text-orange-accent tracking-widest uppercase mb-5">Admin</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-secondary-container flex items-center justify-center text-sm font-bold text-on-surface-variant">
              {user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-on-surface">{user.name}</div>
              <div className="text-xs text-on-surface-variant">Administrador</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-2 mt-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary-container text-on-secondary-container text-sm font-bold">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>admin_panel_settings</span>
            Panel Admin
          </div>
        </nav>

        <div className="px-4 pb-6">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            Salir
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ────────────────────────── */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-surface-container border-b border-outline-variant/40 z-50 flex items-center justify-between px-4">
        <div>
          <div className="text-base font-extrabold italic tracking-tight text-secondary">
            Pick <span className="text-orange-accent">&</span> Serve
          </div>
          <div className="text-xs font-bold text-orange-accent">Admin</div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface px-3 py-2 rounded-lg hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
          Salir
        </button>
      </nav>

      {/* ── Main content ──────────────────────────── */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen pb-10">
        {/* Page header */}
        <div className="px-4 lg:px-8 pt-6 pb-4 border-b border-outline-variant/20">
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">Admin Central</h1>
          <p className="text-sm text-on-surface-variant mt-1">Control del sistema y administración de partidos.</p>
        </div>

        <div className="px-4 lg:px-8 pt-6 flex flex-col gap-6">

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary text-on-primary p-5 rounded-xl border border-outline-variant/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-widest uppercase opacity-80">Jornadas</span>
                <span className="material-symbols-outlined opacity-80" style={{ fontSize: 18 }}>event</span>
              </div>
              <div className="text-4xl font-extrabold tracking-tight">{rounds.length}</div>
              <div className="text-xs opacity-70 mt-1">abiertas actualmente</div>
            </div>
            <div className="bg-surface-container-high p-5 rounded-xl border border-outline-variant">
              <div className="flex items-center justify-between mb-3 text-on-surface-variant">
                <span className="text-xs font-bold tracking-widest uppercase">Partidos</span>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>receipt_long</span>
              </div>
              <div className="text-4xl font-extrabold tracking-tight text-secondary-container">{totalMatches}</div>
              <div className="text-xs text-on-surface-variant mt-1">Pendientes: {pendingMatches}</div>
            </div>
          </div>

          {/* Demo reset */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase text-secondary-container mb-1">
                Reset demo
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Crea un torneo ATP Masters 1000 con jornadas y pronósticos de prueba.
                Disponible solo cuando no hay jornadas abiertas.
              </p>
            </div>
            <button
              onClick={handleResetDemo}
              disabled={processing === 'reset' || rounds.length > 0}
              className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-secondary-container text-on-secondary-container hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {processing === 'reset' ? (
                <><div className="spinner" style={{ borderTopColor: 'currentColor' }} /> Creando...</>
              ) : (
                <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>restart_alt</span> Resetear demo</>
              )}
            </button>
          </div>

          {/* Event architecture info */}
          <div className="bg-surface-container border-l-4 border-orange-accent rounded-xl p-4">
            <div className="text-xs font-bold tracking-widest uppercase text-orange-accent mb-2">
              Arquitectura de eventos
            </div>
            <div className="text-xs text-on-surface-variant leading-relaxed">
              Al cargar un resultado se publica{' '}
              <code className="text-orange-accent bg-orange-accent/10 px-1 rounded font-mono">match.result.loaded</code>{' '}
              en el exchange topic de RabbitMQ. Tres workers lo consumen en paralelo: scoring, notifications y el encadenamiento hacia ranking via{' '}
              <code className="text-orange-accent bg-orange-accent/10 px-1 rounded font-mono">scores.updated</code>.
            </div>
          </div>

          {/* Rounds + matches */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-on-surface-variant text-sm">
              <div className="spinner" /> Cargando...
            </div>
          ) : rounds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant text-sm gap-3">
              <span className="material-symbols-outlined opacity-30" style={{ fontSize: 48 }}>inbox</span>
              <span>No hay jornadas abiertas</span>
              <span className="text-xs opacity-70">Usá &quot;Resetear demo&quot; arriba para crear un torneo nuevo.</span>
            </div>
          ) : (
            rounds.map(round => (
              <div key={round.id} className="flex flex-col gap-3">
                {/* Round header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-orange-accent tracking-wide uppercase">{round.tournament_name}</div>
                    <div className="text-base font-bold text-on-surface">{round.name}</div>
                  </div>
                  <button
                    onClick={() => handleCloseRound(round.id)}
                    disabled={processing === `r${round.id}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    {processing === `r${round.id}` ? (
                      <><div className="spinner" style={{ borderTopColor: '#f87171' }} /> Cerrando...</>
                    ) : (
                      <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</span> Cerrar Jornada</>
                    )}
                  </button>
                </div>

                {/* Match cards */}
                <div className="flex flex-col gap-2">
                  {round.matches.map(match => (
                    <div key={match.id} className="bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden">
                      {/* Match header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
                        <div>
                          <div className="text-sm font-semibold text-on-surface">
                            {match.player_a} <span className="text-on-surface-variant font-normal">vs</span> {match.player_b}
                          </div>
                          <div className="text-xs text-on-surface-variant mt-0.5">Partido #{match.id}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {match.is_final && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 tracking-wide">
                              FINAL +2
                            </span>
                          )}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            match.status === 'finished'
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}>
                            {match.status === 'finished' ? 'Finalizado' : 'Pendiente'}
                          </span>
                        </div>
                      </div>

                      {/* Result buttons */}
                      {match.status === 'pending' && (
                        <div className="flex border-t border-outline-variant/20">
                          {(['player_a', 'player_b'] as const).map((side, idx) => {
                            const name = side === 'player_a' ? match.player_a : match.player_b;
                            const isWinner = match.winner_player_id === side;
                            return (
                              <button
                                key={side}
                                onClick={() => handleResult(match.id, side)}
                                disabled={processing === `m${match.id}`}
                                className={`flex-1 py-3 text-xs font-bold transition-all ${idx === 0 ? 'border-r border-outline-variant/20' : ''} ${
                                  isWinner
                                    ? 'bg-green-500/10 text-green-400'
                                    : 'text-on-surface-variant hover:bg-orange-accent/10 hover:text-orange-accent disabled:opacity-40'
                                }`}
                              >
                                {processing === `m${match.id}` ? 'Procesando...' : `Ganó ${name}`}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
