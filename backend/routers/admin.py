from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Match, Round, Tournament
from schemas import MatchOut, MatchResultRequest
from events.publisher import publish_event
from services.round_progression import try_advance_round

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/matches", response_model=list[MatchOut])
def get_all_matches(db: Session = Depends(get_db)):
    return db.query(Match).all()

@router.post("/matches/{match_id}/result")
async def load_result(match_id: int, data: MatchResultRequest, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.status == "finished":
        raise HTTPException(status_code=400, detail="Match already finished")
    round_ = db.query(Round).filter(Round.id == match.round_id).first()
    if not round_ or round_.status != "open":
        raise HTTPException(status_code=400, detail="Round is not open")
    if data.winner_player_id not in ("player_a", "player_b"):
        raise HTTPException(status_code=400, detail="winner_player_id must be 'player_a' or 'player_b'")
    match.winner_player_id = data.winner_player_id
    match.status = "finished"
    db.commit()
    try_advance_round(db, match.round_id)
    tournament_id = round_.tournament_id if round_ else None
    await publish_event("match.result.loaded", {
        "match_id": match.id,
        "tournament_id": tournament_id,
        "winner_player_id": data.winner_player_id,
        "timestamp": datetime.utcnow().isoformat(),
    })
    return {"ok": True, "match_id": match.id}

@router.post("/demo/reset")
async def demo_reset():
    from seed import reseed_demo
    return reseed_demo()

@router.post("/rounds/{round_id}/close")
async def close_round(round_id: int, db: Session = Depends(get_db)):
    round_ = db.query(Round).filter(Round.id == round_id).first()
    if not round_:
        raise HTTPException(status_code=404, detail="Round not found")
    if round_.status == "closed":
        raise HTTPException(status_code=400, detail="Round already closed")
    round_.status = "closed"
    db.commit()
    await publish_event("round.closed", {
        "round_id": round_.id,
        "name": round_.name,
        "timestamp": datetime.utcnow().isoformat(),
    })
    return {"ok": True, "round_id": round_.id}
