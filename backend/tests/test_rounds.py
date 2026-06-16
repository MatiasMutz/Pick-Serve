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
    # Solo la primera ronda de cada torneo está abierta al inicio
    assert len(rounds) == 2
    names = {r["name"] for r in rounds}
    assert names == {"Octavos de Final"}


def test_rounds_have_matches(seeded_client):
    rounds = seeded_client.get("/rounds/open").json()
    total_matches = sum(len(r["matches"]) for r in rounds)
    assert total_matches == 4  # 3 octavos BA + 1 octavos Córdoba


def test_round_has_tournament_name(seeded_client):
    rounds = seeded_client.get("/rounds/open").json()
    for r in rounds:
        assert r["tournament_name"] != ""
        assert r["status"] == "open"


def test_final_match_has_bonus_flag(seeded_client):
    all_matches = seeded_client.get("/admin/matches").json()
    finals = [m for m in all_matches if m["is_final"]]
    assert len(finals) == 1  # only the Alcaraz vs Djokovic final


def test_next_round_opens_when_current_completes(seeded_client):
    rounds = seeded_client.get("/rounds/open").json()
    cordoba = next(r for r in rounds if r["tournament_name"] == "ATP 250 - Córdoba")
    match = cordoba["matches"][0]

    seeded_client.post(f"/admin/matches/{match['id']}/result", json={"winner_player_id": "player_a"})

    rounds = seeded_client.get("/rounds/open").json()
    cordoba_rounds = [r for r in rounds if r["tournament_name"] == "ATP 250 - Córdoba"]
    assert len(cordoba_rounds) == 1
    assert cordoba_rounds[0]["name"] == "Final"
    assert len(cordoba_rounds[0]["matches"]) == 1
    assert cordoba_rounds[0]["matches"][0]["is_final"] is True
