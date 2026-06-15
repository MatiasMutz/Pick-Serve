const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  getUsers: () => request<import('./types').User[]>('/auth/users'),

  login: (user_id: number) =>
    request<import('./types').AuthUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ user_id }),
    }),

  getOpenRounds: () => request<import('./types').Round[]>('/rounds/open'),

  createPrediction: (user_id: number, match_id: number, predicted_winner: string) =>
    request<import('./types').Prediction>('/predictions', {
      method: 'POST',
      body: JSON.stringify({ user_id, match_id, predicted_winner }),
    }),

  getMyPredictions: (user_id: number) =>
    request<import('./types').Prediction[]>(`/predictions/me?user_id=${user_id}`),

  getRanking: () => request<import('./types').RankingEntry[]>('/ranking'),

  getNotifications: (user_id: number) =>
    request<import('./types').Notification[]>(`/notifications/me?user_id=${user_id}`),

  markNotificationRead: (id: number) =>
    request<{ ok: boolean }>(`/notifications/${id}/read`, { method: 'PUT' }),

  // Admin
  getAllMatches: () => request<import('./types').Match[]>('/admin/matches'),

  loadResult: (match_id: number, winner_player_id: string) =>
    request<{ ok: boolean; match_id: number }>(`/admin/matches/${match_id}/result`, {
      method: 'POST',
      body: JSON.stringify({ winner_player_id }),
    }),

  closeRound: (round_id: number) =>
    request<{ ok: boolean; round_id: number }>(`/admin/rounds/${round_id}/close`, {
      method: 'POST',
    }),
};
