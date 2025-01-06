import pytest
from app import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_market_overview(client):
    response = client.get("/api/market-overview")
    assert response.status_code == 200
