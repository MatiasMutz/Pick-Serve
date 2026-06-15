"""Tests for predictions."""
import pytest


def _get_open_match(seeded_client):
    rounds = seeded_client.get("/rounds/open").json()
    return rounds[0]["matches"][0], rounds[0]["id"]


def _get_player_id(seeded_client):
    users = seeded_client.get("/auth/users").json()
    return next(u["id"] for u in users if not u["is_admin"])


def test_create_prediction(seeded_client):
    match, _ = _get_open_match(seeded_client)
    user_id = _get_player_id(seeded_client)

    res = seeded_client.post("/predictions", json={
        "user_id": user_id,
        "match_id": match["id"],
        "predicted_winner": "player_a",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["predicted_winner"] == "player_a"
    assert data["points"] is None  # not scored yet


def test_prediction_upsert(seeded_client):
    """Re-submitting a prediction updates it rather than duplicating it."""
    match, _ = _get_open_match(seeded_client)
    user_id = _get_player_id(seeded_client)

    seeded_client.post("/predictions", json={
        "user_id": user_id, "match_id": match["id"], "predicted_winner": "player_a",
    })
    seeded_client.post("/predictions", json={
        "user_id": user_id, "match_id": match["id"], "predicted_winner": "player_b",
    })

    res = seeded_client.get(f"/predictions/me?user_id={user_id}")
    preds_for_match = [p for p in res.json() if p["match_id"] == match["id"]]
    assert len(preds_for_match) == 1
    assert preds_for_match[0]["predicted_winner"] == "player_b"


def test_prediction_invalid_match(seeded_client):
    user_id = _get_player_id(seeded_client)
    res = seeded_client.post("/predictions", json={
        "user_id": user_id, "match_id": 99999, "predicted_winner": "player_a",
    })
    assert res.status_code == 404


def test_my_predictions(seeded_client):
    user_id = _get_player_id(seeded_client)
    res = seeded_client.get(f"/predictions/me?user_id={user_id}")
    assert res.status_code == 200
    # Seed pre-loads predictions for non-admin users
    assert len(res.json()) > 0
