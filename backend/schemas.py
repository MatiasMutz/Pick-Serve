from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    is_admin: bool
    model_config = {"from_attributes": True}

class LoginRequest(BaseModel):
    user_id: int

class LoginResponse(BaseModel):
    user_id: int
    name: str
    is_admin: bool

class MatchOut(BaseModel):
    id: int
    round_id: int
    player_a: str
    player_b: str
    winner_player_id: Optional[str] = None
    status: str
    is_final: bool
    model_config = {"from_attributes": True}

class RoundOut(BaseModel):
    id: int
    tournament_id: int
    tournament_name: str
    name: str
    starts_at: datetime
    status: str
    matches: List[MatchOut] = []
    model_config = {"from_attributes": True}

class PredictionCreate(BaseModel):
    user_id: int
    match_id: int
    predicted_winner: str

class PredictionOut(BaseModel):
    id: int
    user_id: int
    match_id: int
    predicted_winner: str
    points: Optional[int] = None
    model_config = {"from_attributes": True}

class MatchResultRequest(BaseModel):
    winner_player_id: str

class RankingOut(BaseModel):
    user_id: int
    user_name: str
    total_points: int
    position: Optional[int] = None
    correct_predictions: int
    total_predictions: int
    model_config = {"from_attributes": True}

class NotificationOut(BaseModel):
    id: int
    user_id: int
    message: str
    created_at: datetime
    read: bool
    model_config = {"from_attributes": True}
