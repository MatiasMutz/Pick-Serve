from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Prediction, Round, Match
from schemas import PredictionCreate, PredictionOut

router = APIRouter(prefix="/predictions", tags=["predictions"])

@router.post("", response_model=PredictionOut)
def create_prediction(data: PredictionCreate, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == data.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    round_ = db.query(Round).filter(Round.id == match.round_id).first()
    if round_ and round_.status == "closed":
        raise HTTPException(status_code=400, detail="Round is closed")
    existing = db.query(Prediction).filter(
        Prediction.user_id == data.user_id,
        Prediction.match_id == data.match_id,
    ).first()
    if existing:
        existing.predicted_winner = data.predicted_winner
        db.commit()
        db.refresh(existing)
        return existing
    pred = Prediction(
        user_id=data.user_id,
        match_id=data.match_id,
        predicted_winner=data.predicted_winner,
    )
    db.add(pred)
    db.commit()
    db.refresh(pred)
    return pred

@router.get("/me", response_model=list[PredictionOut])
def get_my_predictions(user_id: int, db: Session = Depends(get_db)):
    return db.query(Prediction).filter(Prediction.user_id == user_id).all()
