from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Ranking, User
from schemas import RankingOut

router = APIRouter(prefix="/ranking", tags=["ranking"])

@router.get("", response_model=list[RankingOut])
def get_ranking(db: Session = Depends(get_db)):
    rankings = db.query(Ranking).order_by(Ranking.position.asc().nullslast()).all()
    result = []
    for r in rankings:
        user = db.query(User).filter(User.id == r.user_id).first()
        result.append(RankingOut(
            user_id=r.user_id,
            user_name=user.name if user else "Unknown",
            total_points=r.total_points,
            position=r.position,
            correct_predictions=r.correct_predictions,
            total_predictions=r.total_predictions,
        ))
    return result
