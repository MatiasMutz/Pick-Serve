"""
Test config.

Unit tests default to SQLite and a mocked RabbitMQ publisher. Integration tests
set PICKSERVE_INTEGRATION_TESTS=1 and use the DATABASE_URL/RABBITMQ_URL from CI.
The env handling must happen before any app module is imported.
"""
import os

INTEGRATION_TESTS = os.environ.get("PICKSERVE_INTEGRATION_TESTS") == "1"

if not INTEGRATION_TESTS:
    os.environ["DATABASE_URL"] = "sqlite:///./test_pickserve.db"
    os.environ["RABBITMQ_URL"] = "amqp://guest:guest@localhost:5672/"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402
from database import engine, SessionLocal, get_db  # noqa: E402
from models import Base  # noqa: E402
from seed import seed  # noqa: E402

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
    if not INTEGRATION_TESTS:
        # Patch where publish_event is *used* (imported into each router module)
        monkeypatch.setattr("routers.admin.publish_event", mock_publish)
    return TestClient(app)


@pytest.fixture()
def seeded_client(client):
    """Test client with seed data already loaded."""
    seed()
    return client
