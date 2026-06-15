"""Tests for ranking and notifications."""
import pytest


def test_ranking_empty(client):
    res = client.get("/ranking")
    assert res.status_code == 200
    assert res.json() == []


def test_ranking_after_seed(seeded_client):
    """Seed creates ranking rows with 0 points for all players."""
    res = seeded_client.get("/ranking")
    assert res.status_code == 200
    entries = res.json()
    assert len(entries) == 9  # 9 non-admin users
    for e in entries:
        assert e["total_points"] == 0


def test_notifications_empty(seeded_client):
    users = seeded_client.get("/auth/users").json()
    player = next(u for u in users if not u["is_admin"])

    res = seeded_client.get(f"/notifications/me?user_id={player['id']}")
    assert res.status_code == 200
    assert res.json() == []


def test_mark_notification_read_not_found(client):
    res = client.put("/notifications/9999/read")
    assert res.status_code == 404
