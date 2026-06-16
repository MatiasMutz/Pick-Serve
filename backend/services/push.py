import json
import logging
import os

from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from models import PushSubscription

logger = logging.getLogger(__name__)

VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:admin@pickserve.com")


def get_vapid_public_key() -> str:
    return VAPID_PUBLIC_KEY


def is_push_configured() -> bool:
    return bool(VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY)


def send_push_to_user(db: Session, user_id: int, title: str, body: str) -> None:
    if not is_push_configured():
        return

    subs = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
    payload = json.dumps({"title": title, "body": body, "url": "/"})

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_SUBJECT},
            )
            logger.info("📲 Push sent to user_id=%s", user_id)
        except WebPushException as exc:
            status = exc.response.status_code if exc.response is not None else None
            if status in (404, 410):
                db.delete(sub)
                db.commit()
                logger.info("🗑️ Removed expired push subscription for user_id=%s", user_id)
            else:
                logger.warning("⚠️ Push failed for user_id=%s: %s", user_id, exc)
