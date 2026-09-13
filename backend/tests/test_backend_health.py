"""
Backend health tests for Assault of Bronze dev helper API.

Scope (per review request):
  - GET /api/health returns 200 with {"ok": true, "ts": ...}
  - GET /api/ returns 200 with a JSON message
  - Confirm obsolete /api/rooms/* and /api/status endpoints are gone (404)
  - Backend must run cleanly (no MongoDB dependency)
"""
import os
import pytest
import requests

# Tests both the internal supervisor-managed URL and the public URL for parity.
INTERNAL_URL = "http://localhost:8001"
PUBLIC_URL = (os.environ.get("EXPO_BACKEND_URL") or "").rstrip("/")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health endpoint ----------
class TestHealth:
    def test_health_internal_200(self, client):
        r = client.get(f"{INTERNAL_URL}/api/health", timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert isinstance(data.get("ts"), str) and len(data["ts"]) > 0

    def test_health_public_200(self, client):
        if not PUBLIC_URL:
            pytest.skip("EXPO_BACKEND_URL not set")
        r = client.get(f"{PUBLIC_URL}/api/health", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert isinstance(data.get("ts"), str)


# ---------- Root API endpoint ----------
class TestRoot:
    def test_root_internal_200(self, client):
        r = client.get(f"{INTERNAL_URL}/api/", timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "message" in data
        assert isinstance(data["message"], str)

    def test_root_public_200(self, client):
        if not PUBLIC_URL:
            pytest.skip("EXPO_BACKEND_URL not set")
        r = client.get(f"{PUBLIC_URL}/api/", timeout=15)
        assert r.status_code == 200, r.text
        assert "message" in r.json()


# ---------- Obsolete endpoints must be gone ----------
class TestObsoleteEndpointsRemoved:
    def test_rooms_endpoint_gone(self, client):
        r = client.get(f"{INTERNAL_URL}/api/rooms/ABC", timeout=10)
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"

    def test_rooms_characters_endpoint_gone(self, client):
        r = client.get(f"{INTERNAL_URL}/api/rooms/ABC/characters", timeout=10)
        assert r.status_code == 404

    def test_status_endpoint_gone(self, client):
        r = client.get(f"{INTERNAL_URL}/api/status", timeout=10)
        assert r.status_code == 404


# ---------- Env file requirement (deploy pipeline) ----------
class TestEnvFile:
    def test_backend_env_exists_and_readable(self):
        path = "/app/backend/.env"
        assert os.path.isfile(path), f"{path} missing (deploy pipeline requires it)"
        with open(path, "r") as f:
            content = f.read()
        assert "MONGO_URL" in content
        assert "DB_NAME" in content
