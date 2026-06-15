"""
Ranking Worker
--------------
Consumes: scores.updated  (ranking.queue)   ← published by scoring-worker

This demonstrates EVENT CHAINING:
  match.result.loaded → scoring-worker → scores.updated → ranking-worker

Action:
  Recalculates the global ranking by summing all prediction points per user,
  sorts descending, and assigns sequential positions. Persists to rankings table.
"""
import asyncio
import json
import logging

import aio_pika

from base import get_rabbitmq_connection, declare_exchange, get_db
from models import Prediction, Ranking

logging.basicConfig(
    level=logging.INFO,
    format="[ranking-worker]  %(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

QUEUE_NAME = "ranking.queue"
BINDING_KEY = "scores.updated"


async def handle_scores_updated(payload: dict):
    match_id = payload.get("match_id")
    affected = payload.get("affected_user_ids", [])
    logger.info(f"📥 scores.updated | match_id={match_id} | affected_users={affected}")

    db = get_db()
    try:
        # Aggregate total points and prediction stats per user
        all_predictions = db.query(Prediction).filter(Prediction.points.isnot(None)).all()

        stats: dict[int, dict] = {}
        for pred in all_predictions:
            s = stats.setdefault(pred.user_id, {"total_points": 0, "correct": 0, "total": 0})
            if pred.points is not None:
                s["total_points"] += pred.points
                s["total"] += 1
                if pred.points > 0:
                    s["correct"] += 1

        # Sort by total_points descending
        sorted_users = sorted(stats.items(), key=lambda x: x[1]["total_points"], reverse=True)

        for position, (user_id, s) in enumerate(sorted_users, start=1):
            ranking = db.query(Ranking).filter(Ranking.user_id == user_id).first()
            if ranking:
                ranking.total_points = s["total_points"]
                ranking.position = position
                ranking.correct_predictions = s["correct"]
                ranking.total_predictions = s["total"]
            else:
                ranking = Ranking(
                    user_id=user_id,
                    total_points=s["total_points"],
                    position=position,
                    correct_predictions=s["correct"],
                    total_predictions=s["total"],
                )
                db.add(ranking)
            logger.info(f"🏆 #{position} user_id={user_id} → {s['total_points']} pts")

        db.commit()
        logger.info(f"✅ Ranking updated for {len(sorted_users)} users")
    finally:
        db.close()


async def main():
    logger.info("🚀 Starting ranking-worker...")
    connection = await get_rabbitmq_connection()

    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=1)

        exchange = await declare_exchange(channel)
        queue = await channel.declare_queue(QUEUE_NAME, durable=True)
        await queue.bind(exchange, routing_key=BINDING_KEY)

        logger.info(f"👂 Listening on '{QUEUE_NAME}' → '{BINDING_KEY}'")

        async def on_message(message: aio_pika.abc.AbstractIncomingMessage):
            async with message.process():
                try:
                    payload = json.loads(message.body)
                    await handle_scores_updated(payload)
                except Exception as exc:
                    logger.exception(f"❌ Error handling message: {exc}")

        await queue.consume(on_message)
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
