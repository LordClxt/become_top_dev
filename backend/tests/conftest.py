import os

os.environ.setdefault("BTD_DATABASE_URL", "postgresql+asyncpg://btd:btd@localhost:5433/btd_test")
os.environ["BTD_APP_PASSWORD"] = "secret-test"

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.core.db import Base, engine
from app.main import app
from app.models import profile, progress  # noqa: F401


class FakeRunner:
    """Remplace le runner : renvoie une sortie `go test -json` préparée."""

    def __init__(self):
        self.calls = []
        self.output = ""
        self.exit_code = 0

    async def run(self, language, files, command, timeout_s):
        self.calls.append({"language": language, "files": files, "command": command})
        return {"exit_code": self.exit_code, "output": self.output, "duration_ms": 42, "timed_out": False}


def go_json(*tests: tuple[str, str]) -> str:
    lines = []
    for name, status in tests:
        lines.append(f'{{"Action":"run","Test":"{name}"}}')
        if status == "fail":
            lines.append(
                f'{{"Action":"output","Test":"{name}","Output":"    x_test.go:9: mauvais résultat\\n"}}'
            )
        lines.append(f'{{"Action":"{status}","Test":"{name}"}}')
    return "\n".join(lines)


@pytest.fixture(scope="session", autouse=True)
async def schema():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


@pytest.fixture(autouse=True)
async def clean_tables():
    async with engine.begin() as conn:
        names = ", ".join(t.name for t in Base.metadata.sorted_tables)
        await conn.execute(text(f"TRUNCATE {names} RESTART IDENTITY"))


@pytest.fixture
async def client():
    async with app.router.lifespan_context(app):
        runner = FakeRunner()
        app.state.runner = runner
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            c.runner = runner
            yield c


@pytest.fixture
async def auth_client(client):
    r = await client.post("/api/auth/login", json={"password": "secret-test"})
    assert r.status_code == 200
    return client
