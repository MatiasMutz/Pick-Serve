"""Mirror of backend models for workers (same DB)."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from base import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String)
    is_admin = Column(Boolean, default=False)


class Tournament(Base):
    __tablename__ = "tournaments"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    level = Column(String)


class Round(Base):
    __tablename__ = "rounds"
    id = Column(Integer, primary_key=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    name = Column(String)
    starts_at = Column(DateTime)
    status = Column(String, default="open")


class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True)
    round_id = Column(Integer, ForeignKey("rounds.id"))
    player_a = Column(String)
    player_b = Column(String)
    winner_player_id = Column(String, nullable=True)
    status = Column(String, default="pending")
    is_final = Column(Boolean, default=False)


class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    match_id = Column(Integer, ForeignKey("matches.id"))
    predicted_winner = Column(String)
    points = Column(Integer, nullable=True)


class Ranking(Base):
    __tablename__ = "rankings"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    total_points = Column(Integer, default=0)
    position = Column(Integer, nullable=True)
    correct_predictions = Column(Integer, default=0)
    total_predictions = Column(Integer, default=0)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    endpoint = Column(String, unique=True, nullable=False)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    read = Column(Boolean, default=False)
