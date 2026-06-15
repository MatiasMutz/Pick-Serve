"""
Scoring Worker
--------------
Consumes: match.result.loaded  (scoring.queue)
Action:   Calculates points for every prediction on that match.
Publishes: scores.updated  ->  triggers ranking-worker (event chaining)

Scoring rules:
  +3 points  correct prediction
  +2 bonus   if match.is_final (semifinal/final)
   0 points  wrong prediction

Idempotent: skips predictions that already have points assigned.
"""
import asyncio
import json
import logging

import aio_pika

from base import get_rabbitmq_connection, declare_exchange, publish_event, get_db
from models import Match, Prediction

logging.basicConfig(
    level=logging.INFO,
    format="[scoring-worker] %(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

QUEUE_NAME = "scoring.queue"
BINDING_KEY = "match.result.loaded"


async def process_message(message: aio_pika.abc.AbstractIncomingMessage, channel: aio_pika.abc.AbstractChannel):
    async with message.process():
        try:
            payload = json.loads(message.body)
            match_id = payload["match_id"]
            winner = payload["winner_player_id"]
            logger.info(f"📥 Received match.result.loaded | match_id={match_id} winner={winner}")

            db = get_db()
            try:
                match = db.query(Match).filter(Match.id == match_id).first()
                if not match:
                    logger.error(f"❌ Match {match_id} not found in DB")
                    return

                predictions = db.query(Prediction).filter(Prediction.match_id == match_id).all()
                logger.info(f"📊 Found {len(predictions)} predictions for match {match_id}")

                affected_user_ids = []
                for pred in predictions:
                    # Idempotency: skip if already scored
                    if pred.points is not None:
                        logger.info(f"⏭️  Prediction {pred.id} already scored, skipping")
                        continue

                    correct = pred.predicted_winner == winner
                    points = 3 if correct else 0
                    if correct and match.is_final:
                        points += 2  # bonus for finals

                    pred.points = points
                    affected_user_ids.append(pred.user_id)
                    logger.info(
                        f"✅ user_id={pred.user_id} predicted={pred.predicted_winner} "
                        f"winner={winner} → {points} pts"
                    )

                db.commit()
            finally:
                db.close()

            # Publish scores.updated to trigger ranking-worker (event chaining)
            if affected_user_ids:
                await publish_event(channel, "scores.updated", {
                    "match_id": match_id,
                    "affected_user_ids": affected_user_ids,
                })

            logger.info(f"✅ Scoring complete for match {match_id} | affected users: {affected_user_ids}")

        except Exception as exc:
            logger.exception(f"❌ Error processing message: {exc}")


async def main():
    logger.info("🚀 Starting scoring-worker...")
    connection = await get_rabbitmq_connection()

    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=1)

        exchange = await declare_exchange(channel)

        # Durable queue survives broker restarts
        queue = await channel.declare_queue(QUEUE_NAME, durable=True)
        await queue.bind(exchange, routing_key=BINDING_KEY)

        logger.info(f"👂 Listening on queue '{QUEUE_NAME}' with key '{BINDING_KEY}'")

        # Use a closure to pass channel for publishing scores.updated
        async def on_message(msg):
            await process_message(msg, channel)

        await queue.consume(on_message)
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
