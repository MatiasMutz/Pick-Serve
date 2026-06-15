"""Tests for rounds and matches."""
import pytest


def test_open_rounds_empty(client):
    res = client.get("/rounds/open")
    assert res.status_code == 200
    assert res.json() == []


def test_open_rounds_after_seed(seeded_client):
    res = seeded_client.get("/rounds/open")
    assert res.status_code == 200
    rounds = res.json()
    # Seed creates 4 open rounds
    assert len(rounds) == 4


def test_rounds_have_matches(seeded_client):
    rounds = seeded_client.get("/rounds/open").json()
    total_matches = sum(len(r["matches"]) for r in rounds)
    assert total_matches == 6  # seed creates 6 matches


def test_round_has_tournament_name(seeded_client):
    rounds = seeded_client.get("/rounds/open").json()
    for r in rounds:
        assert r["tournament_name"] != ""
        assert r["status"] == "open"


def test_final_match_has_bonus_flag(seeded_client):
    rounds = seeded_client.get("/rounds/open").json()
    all_matches = [m for r in rounds for m in r["matches"]]
    finals = [m for m in all_matches if m["is_final"]]
    assert len(finals) == 1  # only the Alcaraz vs Djokovic final
