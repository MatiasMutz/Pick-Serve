from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Round, Match, Tournament
from schemas import RoundOut, MatchOut

router = APIRouter(prefix="/rounds", tags=["rounds"])

@router.get("/open", response_model=list[RoundOut])
def get_open_rounds(db: Session = Depends(get_db)):
    rounds = db.query(Round).filter(Round.status == "open").all()
    result = []
    for r in rounds:
        tournament = db.query(Tournament).filter(Tournament.id == r.tournament_id).first()
        matches = db.query(Match).filter(Match.round_id == r.id).all()
        result.append(RoundOut(
            id=r.id,
            tournament_id=r.tournament_id,
            tournament_name=tournament.name if tournament else "",
            name=r.name,
            starts_at=r.starts_at,
            status=r.status,
            matches=[MatchOut.model_validate(m) for m in matches],
        ))
    return result
