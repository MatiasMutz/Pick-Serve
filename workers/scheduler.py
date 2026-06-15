"""
Round Scheduler
---------------
Polls every 60 seconds for open rounds whose starts_at is in the past.
When found, publishes a 'round.closed' event — the same event fired by
POST /admin/rounds/{id}/close — so the notification-worker handles it.

This demonstrates a SECOND type of event trigger (time-based, not HTTP-based).
"""
import asyncio
import json
import logging
from datetime import datetime

import aio_pika

from base import get_rabbitmq_connection, declare_exchange, publish_event, get_db
from models import Round

logging.basicConfig(
    level=logging.INFO,
    format="[scheduler]       %(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

CHECK_INTERVAL_SECONDS = 60


async def check_and_close_rounds(channel: aio_pika.abc.AbstractChannel):
    db = get_db()
    try:
        now = datetime.utcnow()
        overdue = (
            db.query(Round)
            .filter(Round.status == "open", Round.starts_at <= now)
            .all()
        )
        for round_ in overdue:
            logger.info(f"⏰ Round '{round_.name}' (id={round_.id}) is overdue, closing...")
            round_.status = "closed"
            db.commit()
            await publish_event(channel, "round.closed", {
                "round_id": round_.id,
                "name": round_.name,
                "timestamp": now.isoformat(),
            })
            logger.info(f"✅ Published round.closed for round_id={round_.id}")
    finally:
        db.close()


async def main():
    logger.info("🚀 Starting scheduler...")
    connection = await get_rabbitmq_connection()

    async with connection:
        channel = await connection.channel()
        await declare_exchange(channel)
        logger.info(f"🕐 Checking for overdue rounds every {CHECK_INTERVAL_SECONDS}s")

        while True:
            try:
                await check_and_close_rounds(channel)
            except Exception as exc:
                logger.exception(f"❌ Scheduler error: {exc}")
            await asyncio.sleep(CHECK_INTERVAL_SECONDS)


if __name__ == "__main__":
    asyncio.run(main())
