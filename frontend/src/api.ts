// Local/Docker: '/api' (nginx proxy). Railway: set VITE_API_URL to the backend public URL at build time.
const BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

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

  resetDemo: () =>
    request<{ skipped: boolean; reason?: string; tournament?: string; rounds?: number; matches?: number }>(
      '/admin/demo/reset',
      { method: 'POST' },
    ),

  getVapidPublicKey: () => request<{ public_key: string }>('/push/vapid-public-key'),

  subscribePush: (user_id: number, subscription: PushSubscriptionPayload) =>
    request<{ ok: boolean }>('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ user_id, subscription }),
    }),

  unsubscribePush: (user_id: number, endpoint: string) =>
    request<{ ok: boolean }>('/push/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ user_id, endpoint }),
    }),
};

