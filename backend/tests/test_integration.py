"""Integration tests against real PostgreSQL and RabbitMQ services."""
import json
import os

import aio_pika
import pytest
from httpx import ASGITransport, AsyncClient

from main import app
from seed import seed


pytestmark = pytest.mark.integration


async def _bind_probe_queue(routing_key: str):
    connection = await aio_pika.connect_robust(os.environ["RABBITMQ_URL"])
    channel = await connection.channel()
    exchange = await channel.declare_exchange(
        "pickandserve.events",
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )
    queue = await channel.declare_queue("", exclusive=True, auto_delete=True)
    await queue.bind(exchange, routing_key=routing_key)
    return connection, queue


@pytest.mark.asyncio
async def test_load_result_publishes_event_to_rabbitmq():
    connection, queue = await _bind_probe_queue("match.result.loaded")
    try:
        seed()
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
        ) as client:
            rounds = (await client.get("/rounds/open")).json()
            match = next(
                match
                for round_ in rounds
                for match in round_["matches"]
                if match["status"] == "pending"
            )

            response = await client.post(
                f"/admin/matches/{match['id']}/result",
                json={"winner_player_id": "player_a"},
            )

        assert response.status_code == 200

        message = await queue.get(timeout=5, fail=False)
        assert message is not None

        await message.ack()
        event = json.loads(message.body.decode())
        assert event["match_id"] == match["id"]
        assert event["winner_player_id"] == "player_a"
    finally:
        await connection.close()
