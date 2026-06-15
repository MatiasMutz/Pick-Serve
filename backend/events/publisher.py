import json
import os
import asyncio
import logging
from typing import Any, Dict

import aio_pika

logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
EXCHANGE_NAME = "pickandserve.events"


async def get_exchange(channel: aio_pika.abc.AbstractChannel):
    exchange = await channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )
    return exchange


async def publish_event(routing_key: str, payload: Dict[str, Any]):
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        exchange = await get_exchange(channel)
        message_body = json.dumps(payload, default=str).encode()
        await exchange.publish(
            aio_pika.Message(body=message_body, content_type="application/json"),
            routing_key=routing_key,
        )
        logger.info(f"📤 Published [{routing_key}]: {payload}")


def publish_event_sync(routing_key: str, payload: Dict[str, Any]):
    asyncio.run(publish_event(routing_key, payload))
