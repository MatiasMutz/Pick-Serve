"""
Notification Worker
-------------------
Consumes: match.result.loaded  (notifications.queue)
          round.closed         (notifications.round.queue)

Action on match.result.loaded:
  Creates an in-app notification for each user with a prediction on that match.
  "✅ Acertaste! +3 puntos – Alcaraz vs Medvedev"
  "❌ No acertaste – Alcaraz vs Medvedev"

Action on round.closed:
  Creates a notification for all users:
  "🔒 La jornada [name] ha sido cerrada."
"""
import asyncio
import json
import logging
from datetime import datetime

import aio_pika

from base import get_rabbitmq_connection, declare_exchange, get_db
from models import Match, Prediction, Notification, User, Round
from push import send_push_to_user

logging.basicConfig(
    level=logging.INFO,
    format="[notification-worker] %(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

QUEUE_MATCH = "notifications.queue"
QUEUE_ROUND = "notifications.round.queue"


async def handle_match_result(payload: dict):
    match_id = payload["match_id"]
    winner = payload["winner_player_id"]
    logger.info(f"📥 match.result.loaded | match_id={match_id}")

    db = get_db()
    try:
        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            logger.error(f"❌ Match {match_id} not found")
            return

        match_label = f"{match.player_a} vs {match.player_b}"
        predictions = db.query(Prediction).filter(Prediction.match_id == match_id).all()

        push_targets: list[tuple[int, str, str]] = []

        for pred in predictions:
            correct = pred.predicted_winner == winner
            if correct:
                msg = f"✅ ¡Acertaste! Tu pronóstico fue correcto en {match_label}."
                title = "¡Acertaste!"
            else:
                msg = f"❌ No acertaste en {match_label}. ¡Suerte la próxima!"
                title = "Resultado del partido"

            notif = Notification(
                user_id=pred.user_id,
                message=msg,
                created_at=datetime.utcnow(),
            )
            db.add(notif)
            push_targets.append((pred.user_id, title, msg))
            logger.info(f"🔔 Notification for user_id={pred.user_id}: {msg}")

        db.commit()

        for user_id, title, msg in push_targets:
            send_push_to_user(db, user_id, title, msg)

        logger.info(f"✅ Created {len(predictions)} notifications for match {match_id}")
    finally:
        db.close()


async def handle_round_closed(payload: dict):
    round_id = payload["round_id"]
    logger.info(f"📥 round.closed | round_id={round_id}")

    db = get_db()
    try:
        round_ = db.query(Round).filter(Round.id == round_id).first()
        round_name = round_.name if round_ else f"#{round_id}"

        users = db.query(User).filter(User.is_admin == False).all()
        msg = f"🔒 La jornada '{round_name}' ha sido cerrada. Ya no se aceptan pronósticos."

        for user in users:
            notif = Notification(
                user_id=user.id,
                message=msg,
                created_at=datetime.utcnow(),
            )
            db.add(notif)

        db.commit()

        for user in users:
            send_push_to_user(
                db,
                user.id,
                "Jornada cerrada",
                msg,
            )

        logger.info(f"✅ Created {len(users)} round-closed notifications for '{round_name}'")
    finally:
        db.close()


async def consume_queue(connection, queue_name: str, binding_key: str, handler):
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=1)
    exchange = await declare_exchange(channel)
    queue = await channel.declare_queue(queue_name, durable=True)
    await queue.bind(exchange, routing_key=binding_key)
    logger.info(f"👂 Listening on '{queue_name}' → '{binding_key}'")

    async def on_message(message: aio_pika.abc.AbstractIncomingMessage):
        async with message.process():
            try:
                payload = json.loads(message.body)
                await handler(payload)
            except Exception as exc:
                logger.exception(f"❌ Error handling message: {exc}")

    await queue.consume(on_message)


async def main():
    logger.info("🚀 Starting notification-worker...")
    connection = await get_rabbitmq_connection()

    async with connection:
        await consume_queue(connection, QUEUE_MATCH, "match.result.loaded", handle_match_result)
        await consume_queue(connection, QUEUE_ROUND, "round.closed", handle_round_closed)
        logger.info("✅ notification-worker ready, waiting for events...")
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
