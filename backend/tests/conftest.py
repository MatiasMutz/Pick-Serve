"""
Test config: SQLite in-memory, RabbitMQ publisher mocked.

The DATABASE_URL env var must be set before any app module is imported,
so it goes at the very top of this file (pytest loads conftest first).
"""
import os

# Override DB URL before any import touches it
os.environ["DATABASE_URL"] = "sqlite:///./test_pickserve.db"
os.environ["RABBITMQ_URL"] = "amqp://guest:guest@localhost:5672/"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402
from database import engine, SessionLocal, get_db  # noqa: E402
from models import Base  # noqa: E402

# ─── dependency override ───
def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Track events published during each test
published_events: list[dict] = []


async def mock_publish(routing_key: str, payload: dict):
    published_events.append({"routing_key": routing_key, "payload": payload})


@pytest.fixture(autouse=True)
def setup_db():
    """Fresh tables for every test."""
    Base.metadata.create_all(bind=engine)
    published_events.clear()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(monkeypatch):
    """Test client with mocked event publisher."""
    # Patch where publish_event is *used* (imported into each router module)
    monkeypatch.setattr("routers.admin.publish_event", mock_publish)
    return TestClient(app)


@pytest.fixture()
def seeded_client(client):
    """Test client with seed data already loaded."""
    from seed import seed
    seed()
    return client
