export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
}

export interface AuthUser {
  user_id: number;
  name: string;
  is_admin: boolean;
}

export interface Match {
  id: number;
  round_id: number;
  player_a: string;
  player_b: string;
  winner_player_id: string | null;
  status: string;
  is_final: boolean;
}

export interface Round {
  id: number;
  tournament_id: number;
  tournament_name: string;
  name: string;
  starts_at: string;
  status: string;
  matches: Match[];
}

export interface Prediction {
  id: number;
  user_id: number;
  match_id: number;
  predicted_winner: string;
  points: number | null;
}

export interface RankingEntry {
  user_id: number;
  user_name: string;
  total_points: number;
  position: number | null;
  correct_predictions: number;
  total_predictions: number;
}

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  created_at: string;
  read: boolean;
}
