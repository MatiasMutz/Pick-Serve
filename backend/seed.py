import logging
from datetime import datetime, timedelta
from database import SessionLocal
from models import User, Tournament, Round, Match, Prediction, Ranking

logger = logging.getLogger(__name__)

PLAYERS = {
    "djokovic": "Novak Djokovic 🇷🇸",
    "alcaraz": "Carlos Alcaraz 🇪🇸",
    "medvedev": "Daniil Medvedev 🇷🇺",
    "zverev": "Alexander Zverev 🇩🇪",
    "sinner": "Jannik Sinner 🇮🇹",
    "rublev": "Andrey Rublev 🇷🇺",
    "tsitsipas": "Stefanos Tsitsipas 🇬🇷",
    "fritz": "Taylor Fritz 🇺🇸",
    "paul": "Tommy Paul 🇺🇸",
    "ruud": "Casper Ruud 🇳🇴",
}

def seed():
    db = SessionLocal()
    try:
        existing = db.query(User).first()
        if existing:
            logger.info("✅ Database already seeded, skipping.")
            return

        logger.info("🌱 Seeding database...")

        users_data = [
            {"name": "Admin", "email": "admin@pickserve.com", "is_admin": True},
            {"name": "Martín García", "email": "martin@example.com"},
            {"name": "Sofía López", "email": "sofia@example.com"},
            {"name": "Agustín Pérez", "email": "agustin@example.com"},
            {"name": "Valentina Torres", "email": "valentina@example.com"},
            {"name": "Tomás Rodríguez", "email": "tomas@example.com"},
            {"name": "Camila Fernández", "email": "camila@example.com"},
            {"name": "Nicolás Martínez", "email": "nicolas@example.com"},
            {"name": "Lucía Sánchez", "email": "lucia@example.com"},
            {"name": "Federico Álvarez", "email": "federico@example.com"},
        ]
        users = []
        for ud in users_data:
            u = User(name=ud["name"], email=ud["email"], is_admin=ud.get("is_admin", False))
            db.add(u)
            users.append(u)
        db.commit()
        for u in users:
            db.refresh(u)

        t1 = Tournament(name="ATP 500 - Buenos Aires", level="ATP 500")
        t2 = Tournament(name="ATP 250 - Córdoba", level="ATP 250")
        db.add_all([t1, t2])
        db.commit()
        db.refresh(t1)
        db.refresh(t2)

        now = datetime.utcnow()
        r1 = Round(tournament_id=t1.id, name="Cuartos de Final", starts_at=now - timedelta(hours=2), status="open")
        r2 = Round(tournament_id=t1.id, name="Semifinal", starts_at=now + timedelta(days=1), status="open")
        r3 = Round(tournament_id=t2.id, name="Cuartos de Final", starts_at=now - timedelta(hours=1), status="open")
        r4 = Round(tournament_id=t2.id, name="Final", starts_at=now + timedelta(days=2), status="open")
        db.add_all([r1, r2, r3, r4])
        db.commit()
        for r in [r1, r2, r3, r4]:
            db.refresh(r)

        matches_data = [
            (r1.id, PLAYERS["alcaraz"], PLAYERS["medvedev"], False),
            (r1.id, PLAYERS["djokovic"], PLAYERS["zverev"], False),
            (r1.id, PLAYERS["sinner"], PLAYERS["rublev"], False),
            (r2.id, PLAYERS["tsitsipas"], PLAYERS["fritz"], False),
            (r3.id, PLAYERS["paul"], PLAYERS["ruud"], False),
            (r4.id, PLAYERS["alcaraz"], PLAYERS["djokovic"], True),
        ]
        matches = []
        for (rid, pa, pb, is_final) in matches_data:
            m = Match(round_id=rid, player_a=pa, player_b=pb, is_final=is_final)
            db.add(m)
            matches.append(m)
        db.commit()
        for m in matches:
            db.refresh(m)

        non_admin_users = [u for u in users if not u.is_admin]
        prediction_map = [
            (matches[0], ["player_a", "player_a", "player_b", "player_a", "player_b", "player_a", "player_a", "player_b", "player_a"]),
            (matches[1], ["player_b", "player_a", "player_a", "player_b", "player_a", "player_b", "player_a", "player_a", "player_b"]),
            (matches[2], ["player_a", "player_b", "player_a", "player_a", "player_b", "player_a", "player_b", "player_a", "player_a"]),
            (matches[4], ["player_a", "player_b", "player_a", "player_b", "player_a", "player_a", "player_b", "player_a", "player_b"]),
            (matches[5], ["player_a", "player_a", "player_b", "player_a", "player_b", "player_a", "player_a", "player_b", "player_a"]),
        ]
        for (match, preds) in prediction_map:
            for i, user in enumerate(non_admin_users):
                if i < len(preds):
                    p = Prediction(user_id=user.id, match_id=match.id, predicted_winner=preds[i])
                    db.add(p)
        db.commit()

        for user in non_admin_users:
            r = Ranking(user_id=user.id, total_points=0, position=None, correct_predictions=0, total_predictions=0)
            db.add(r)
        db.commit()

        logger.info("✅ Seed complete!")
    finally:
        db.close()
