"""Shared DB and RabbitMQ helpers for all workers."""
import json
import os
import time
import asyncio
import logging
from typing import Any, Dict

import aio_pika
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/pickserve")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
EXCHANGE_NAME = "pickandserve.events"


def get_engine(retries: int = 15, delay: int = 5):
    for attempt in range(retries):
        try:
            engine = create_engine(DATABASE_URL)
            with engine.connect():
                pass
            logger.info("✅ Connected to PostgreSQL")
            return engine
        except Exception as exc:
            logger.warning(f"⏳ PostgreSQL not ready (attempt {attempt + 1}/{retries}): {exc}")
            time.sleep(delay)
    raise RuntimeError("Cannot connect to PostgreSQL")


class Base(DeclarativeBase):
    pass


engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    return SessionLocal()


async def get_rabbitmq_connection(retries: int = 15, delay: int = 5) -> aio_pika.abc.AbstractRobustConnection:
    for attempt in range(retries):
        try:
            conn = await aio_pika.connect_robust(RABBITMQ_URL)
            logger.info("✅ Connected to RabbitMQ")
            return conn
        except Exception as exc:
            logger.warning(f"⏳ RabbitMQ not ready (attempt {attempt + 1}/{retries}): {exc}")
            await asyncio.sleep(delay)
    raise RuntimeError("Cannot connect to RabbitMQ")


async def declare_exchange(channel: aio_pika.abc.AbstractChannel):
    return await channel.declare_exchange(
        EXCHANGE_NAME, aio_pika.ExchangeType.TOPIC, durable=True
    )


async def publish_event(channel: aio_pika.abc.AbstractChannel, routing_key: str, payload: Dict[str, Any]):
    exchange = await declare_exchange(channel)
    body = json.dumps(payload, default=str).encode()
    await exchange.publish(
        aio_pika.Message(body=body, content_type="application/json"),
        routing_key=routing_key,
    )
    logger.info(f"📤 Published [{routing_key}]: {payload}")
