"""Tests for auth endpoints."""
import pytest


def test_list_users_empty(client):
    res = client.get("/auth/users")
    assert res.status_code == 200
    assert res.json() == []


def test_list_users_after_seed(seeded_client):
    res = seeded_client.get("/auth/users")
    assert res.status_code == 200
    users = res.json()
    assert len(users) == 10
    emails = [u["email"] for u in users]
    assert "admin@pickserve.com" in emails


def test_login_success(seeded_client):
    users = seeded_client.get("/auth/users").json()
    admin = next(u for u in users if u["is_admin"])

    res = seeded_client.post("/auth/login", json={"user_id": admin["id"]})
    assert res.status_code == 200
    data = res.json()
    assert data["user_id"] == admin["id"]
    assert data["is_admin"] is True


def test_login_invalid_user(client):
    res = client.post("/auth/login", json={"user_id": 9999})
    assert res.status_code == 404


def test_admin_user_exists(seeded_client):
    users = seeded_client.get("/auth/users").json()
    admins = [u for u in users if u["is_admin"]]
    assert len(admins) == 1
    assert admins[0]["email"] == "admin@pickserve.com"
