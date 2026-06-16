from sqlalchemy.orm import Session

from models import Match, Round


def try_advance_round(db: Session, round_id: int) -> Round | None:
    """Close a completed round and open the next pending one in the same tournament."""
    round_ = db.query(Round).filter(Round.id == round_id).first()
    if not round_ or round_.status != "open":
        return None

    matches = db.query(Match).filter(Match.round_id == round_id).all()
    if not matches or not all(m.status == "finished" for m in matches):
        return None

    round_.status = "closed"

    next_round = (
        db.query(Round)
        .filter(
            Round.tournament_id == round_.tournament_id,
            Round.status == "pending",
        )
        .order_by(Round.starts_at)
        .first()
    )
    if next_round:
        next_round.status = "open"

    db.commit()
    return next_round
