from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import PushSubscription, User
from schemas import PushSubscribeRequest, PushUnsubscribeRequest, VapidPublicKeyOut
from services.push import get_vapid_public_key, is_push_configured

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/vapid-public-key", response_model=VapidPublicKeyOut)
def vapid_public_key():
    public_key = get_vapid_public_key()
    if not public_key:
        raise HTTPException(status_code=503, detail="Web Push is not configured")
    return VapidPublicKeyOut(public_key=public_key)


@router.post("/subscribe")
def subscribe(data: PushSubscribeRequest, db: Session = Depends(get_db)):
    if not is_push_configured():
        raise HTTPException(status_code=503, detail="Web Push is not configured")

    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == data.subscription.endpoint
    ).first()

    if existing:
        existing.user_id = data.user_id
        existing.p256dh = data.subscription.keys.p256dh
        existing.auth = data.subscription.keys.auth
    else:
        db.add(PushSubscription(
            user_id=data.user_id,
            endpoint=data.subscription.endpoint,
            p256dh=data.subscription.keys.p256dh,
            auth=data.subscription.keys.auth,
        ))

    db.commit()
    return {"ok": True}


@router.delete("/subscribe")
def unsubscribe(data: PushUnsubscribeRequest, db: Session = Depends(get_db)):
    sub = db.query(PushSubscription).filter(
        PushSubscription.user_id == data.user_id,
        PushSubscription.endpoint == data.endpoint,
    ).first()
    if sub:
        db.delete(sub)
        db.commit()
    return {"ok": True}
