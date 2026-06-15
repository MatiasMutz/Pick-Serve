"""Tests for admin endpoints (event publishing mocked)."""
import pytest
from tests.conftest import published_events


def _get_pending_match(seeded_client):
    rounds = seeded_client.get("/rounds/open").json()
    for r in rounds:
        for m in r["matches"]:
            if m["status"] == "pending":
                return m
    return None


def test_load_result_publishes_event(seeded_client):
    match = _get_pending_match(seeded_client)
    assert match is not None

    res = seeded_client.post(f"/admin/matches/{match['id']}/result", json={
        "winner_player_id": "player_a"
    })
    assert res.status_code == 200
    assert res.json()["ok"] is True

    # Verify event was published
    assert len(published_events) == 1
    event = published_events[0]
    assert event["routing_key"] == "match.result.loaded"
    assert event["payload"]["match_id"] == match["id"]
    assert event["payload"]["winner_player_id"] == "player_a"


def test_load_result_marks_match_finished(seeded_client):
    match = _get_pending_match(seeded_client)
    seeded_client.post(f"/admin/matches/{match['id']}/result", json={"winner_player_id": "player_b"})

    rounds = seeded_client.get("/rounds/open").json()
    all_matches = {m["id"]: m for r in rounds for m in r["matches"]}

    # Match might no longer appear in open rounds if round was closed,
    # but it should be marked finished in admin view
    res = seeded_client.get("/admin/matches")
    finished = [m for m in res.json() if m["id"] == match["id"]]
    assert finished[0]["status"] == "finished"
    assert finished[0]["winner_player_id"] == "player_b"


def test_cannot_load_result_twice(seeded_client):
    match = _get_pending_match(seeded_client)
    seeded_client.post(f"/admin/matches/{match['id']}/result", json={"winner_player_id": "player_a"})

    res = seeded_client.post(f"/admin/matches/{match['id']}/result", json={"winner_player_id": "player_b"})
    assert res.status_code == 400


def test_invalid_winner_rejected(seeded_client):
    match = _get_pending_match(seeded_client)
    res = seeded_client.post(f"/admin/matches/{match['id']}/result", json={"winner_player_id": "player_c"})
    assert res.status_code == 400


def test_close_round_publishes_event(seeded_client):
    rounds = seeded_client.get("/rounds/open").json()
    round_id = rounds[0]["id"]

    res = seeded_client.post(f"/admin/rounds/{round_id}/close")
    assert res.status_code == 200
    assert res.json()["ok"] is True

    round_events = [e for e in published_events if e["routing_key"] == "round.closed"]
    assert len(round_events) == 1
    assert round_events[0]["payload"]["round_id"] == round_id


def test_close_round_twice_rejected(seeded_client):
    rounds = seeded_client.get("/rounds/open").json()
    round_id = rounds[0]["id"]

    seeded_client.post(f"/admin/rounds/{round_id}/close")
    res = seeded_client.post(f"/admin/rounds/{round_id}/close")
    assert res.status_code == 400


def test_prediction_blocked_on_closed_round(seeded_client):
    rounds = seeded_client.get("/rounds/open").json()
    round_id = rounds[0]["id"]
    match_id = rounds[0]["matches"][0]["id"]

    users = seeded_client.get("/auth/users").json()
    user_id = next(u["id"] for u in users if not u["is_admin"])

    seeded_client.post(f"/admin/rounds/{round_id}/close")

    res = seeded_client.post("/predictions", json={
        "user_id": user_id, "match_id": match_id, "predicted_winner": "player_a"
    })
    assert res.status_code == 400
