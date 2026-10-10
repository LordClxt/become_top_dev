"""Enregistre le contrat de l'API Python, rejoué ensuite par le backend Go.

Usage : cd backend && uv run python -m tests.record_contract

Écrit testdata/contract/scenario.json (les requêtes) et testdata/contract/golden.json
(les réponses normalisées). Base de test vidée au départ : btd_test sur le port 5433.
"""

import asyncio
import base64
import json
import os
import re
from pathlib import Path

os.environ.setdefault("BTD_DATABASE_URL", "postgresql+asyncpg://btd:btd@localhost:5433/btd_test")
os.environ["BTD_APP_PASSWORD"] = "secret-test"

from httpx import ASGITransport, AsyncClient

from app.core.db import Base, engine
from app.main import app
from app.models import profile, progress  # noqa: F401
from tests.conftest import FakeRunner, go_json

OUT = Path(__file__).resolve().parents[1] / "testdata" / "contract"
LAB = "go-ch02-l03-lab-chunk"
QUIZ = "go-ch02-l03-quiz"
KATA = "arch-sandbox-ggg-bid-flow"
MASKED = {"avatar_version", "duration_ms"}
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
DATETIME = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def step(name, method, path, **kw):
    return {"name": name, "method": method, "path": path, **kw}


def scenario(content) -> list[dict]:
    tz = "tz=Europe/Paris"
    steps = [
        step("health", "GET", "/api/health"),
        step("me-anonymous", "GET", "/api/auth/me"),
        step("courses-anonymous", "GET", "/api/courses"),
        step("avatar-put-anonymous", "PUT", "/api/profile/avatar", body_b64=base64.b64encode(PNG).decode()),
        step("login-wrong", "POST", "/api/auth/login", json={"password": "faux"}),
        step("catalog", "GET", "/api/catalog"),
        step("login", "POST", "/api/auth/login", json={"password": "secret-test"}),
        step("me", "GET", "/api/auth/me"),
        step("courses-fresh", "GET", "/api/courses"),
        step("progress-fresh", "GET", f"/api/progress?{tz}"),
        step("chapter-unknown", "GET", "/api/chapters/nope"),
        step("lesson-unknown", "GET", "/api/lessons/nope"),
        step("quiz-unknown", "GET", "/api/quizzes/nope"),
        step("exercise-unknown", "GET", "/api/exercises/nope"),
        step("sandbox", "GET", "/api/exercises"),
    ]
    # Tout le contenu, sur une base vide : c'est la parité du loader vue depuis l'API.
    steps += [step(f"chapter:{i}", "GET", f"/api/chapters/{i}") for i in sorted(content.chapters)]
    steps += [step(f"lesson:{i}", "GET", f"/api/lessons/{i}") for i in sorted(content.lessons)]
    steps += [step(f"quiz:{i}", "GET", f"/api/quizzes/{i}") for i in sorted(content.quizzes)]
    steps += [step(f"exercise:{i}", "GET", f"/api/exercises/{i}") for i in sorted(content.exercises)]

    lab = f"/api/exercises/{LAB}"
    quiz = f"/api/quizzes/{QUIZ}/questions"
    kata = f"/api/exercises/{KATA}"

    def kata_file(side: str) -> str:
        return (content.exercises[KATA].path / side / "diagram.json").read_text(encoding="utf-8")

    steps += [
        step("lesson-complete", "POST", "/api/lessons/go-ch02-l03/complete"),
        step("lesson-complete-again", "POST", "/api/lessons/go-ch02-l03/complete"),
        step("lesson-complete-l01", "POST", "/api/lessons/go-ch02-l01/complete"),
        step("quiz-q2-wrong", "POST", f"{quiz}/q2", json={"answer": "?"}),
        step("quiz-q2-right", "POST", f"{quiz}/q2", json={"answer": "[a b z d]"}),
        step("quiz-q1-right", "POST", f"{quiz}/q1", json={"answer": "[1 20 3 4]"}),
        step("quiz-question-unknown", "POST", f"{quiz}/nope", json={"answer": "x"}),
        step("quiz-after-answers", "GET", f"/api/quizzes/{QUIZ}"),
        step("draft-save", "PUT", f"{lab}/draft", json={"files": {"chunk.go": "brouillon"}}),
        step("draft-forbidden-file", "PUT", f"{lab}/draft", json={"files": {"tests/chunk_test.go": "x"}}),
        step("exercise-with-draft", "GET", lab),
        step("hint-1", "POST", f"{lab}/hints"),
        step(
            "run-fail",
            "POST",
            f"{lab}/run",
            json={"files": {"chunk.go": "mon code"}},
            runner={"exit_code": 1, "output": go_json(("TestChunkValues", "fail"))},
        ),
        step("exercise-after-fail", "GET", lab),
        step(
            "run-pass",
            "POST",
            f"{lab}/run",
            json={"files": {"chunk.go": "package lab"}},
            runner={"exit_code": 0, "output": go_json(("TestChunkValues", "pass"), ("TestOther", "skip"))},
        ),
        step(
            "run-pass-again",
            "POST",
            f"{lab}/run",
            json={"files": {"chunk.go": "x"}},
            runner={"exit_code": 0, "output": go_json(("TestChunkValues", "pass"))},
        ),
        step(
            "run-build-error",
            "POST",
            f"{lab}/run",
            json={"files": {"chunk.go": "x"}},
            runner={
                "exit_code": 1,
                "output": "# lab\n./chunk.go:1:1: expected 'package'\nFAIL\tlab [build failed]",
            },
        ),
        step("run-overwrite-tests", "POST", f"{lab}/run", json={"files": {"tests/chunk_test.go": "x"}}),
        step("exercise-after-pass", "GET", lab),
        step("reset", "POST", f"{lab}/reset"),
        step("exercise-after-reset", "GET", lab),
        step(
            "diagram-run-starter",
            "POST",
            f"{kata}/run",
            json={"files": {"diagram.json": kata_file("starter")}},
        ),
        step(
            "diagram-run-solution",
            "POST",
            f"{kata}/run",
            json={"files": {"diagram.json": kata_file("solution")}},
        ),
        step(
            "diagram-run-again",
            "POST",
            f"{kata}/run",
            json={"files": {"diagram.json": kata_file("solution")}},
        ),
        step(
            "diagram-run-invalid",
            "POST",
            f"{kata}/run",
            json={"files": {"diagram.json": "{"}},
            select="status",
        ),
        step("diagram-after", "GET", kata),
        step("courses-after", "GET", "/api/courses"),
        step("chapter-after", "GET", "/api/chapters/go-ch02"),
        step("lesson-after", "GET", "/api/lessons/go-ch02-l03"),
        step("progress-after", "GET", f"/api/progress?{tz}"),
        step("activity-today", "GET", f"/api/activity?weeks=1&{tz}", select="last"),
        step("activity-26-weeks", "GET", f"/api/activity?{tz}", select="status"),
        step("activity-bad-tz", "GET", "/api/activity?tz=Mars/Olympus"),
        step("activity-bad-weeks", "GET", "/api/activity?weeks=0"),
        step("feed", "GET", f"/api/activity/feed?{tz}"),
        step("feed-other-day", "GET", "/api/activity/feed?day=2020-01-01"),
        step("profile-empty", "GET", "/api/profile"),
        step("avatar-missing", "GET", "/api/profile/avatar"),
        step("avatar-put", "PUT", "/api/profile/avatar", body_b64=base64.b64encode(PNG).decode()),
        step("profile-with-avatar", "GET", "/api/profile"),
        step("avatar-get", "GET", "/api/profile/avatar"),
        step("avatar-delete", "DELETE", "/api/profile/avatar"),
        step("profile-after-delete", "GET", "/api/profile"),
        step(
            "avatar-svg", "PUT", "/api/profile/avatar", body_b64=base64.b64encode(b"<svg onload=x>").decode()
        ),
        step("avatar-empty", "PUT", "/api/profile/avatar", body_b64=""),
        step("logout", "POST", "/api/auth/logout"),
        step("me-after-logout", "GET", "/api/auth/me"),
    ]
    return steps


def normalize(value):
    """Masque ce qui dépend de l'heure ou de la machine d'enregistrement. Même règle côté Go."""
    if isinstance(value, dict):
        return {k: "<int>" if k in MASKED and v is not None else normalize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [normalize(v) for v in value]
    if isinstance(value, str):
        if DATETIME.match(value):
            return "<datetime>"
        if DATE.match(value):
            return "<date>"
    return value


def record(s: dict, r, runner: FakeRunner) -> dict:
    out = {"name": s["name"], "status": r.status_code}
    ctype = r.headers.get("content-type", "")
    if s.get("select") == "status" or r.status_code == 204:
        pass
    elif r.status_code >= 400:
        detail = r.json().get("detail")
        if isinstance(detail, str):  # les erreurs 422 de validation ne sont comparées que sur le statut
            out["detail"] = detail
    elif ctype.startswith("application/json"):
        body = r.json()
        out["body"] = normalize(body[-1] if s.get("select") == "last" else body)
    else:
        out["content_type"] = ctype
        out["body_b64"] = base64.b64encode(r.content).decode()
    if s.get("runner") and runner.calls:
        call = runner.calls.pop()
        out["runner_call"] = {
            "language": call["language"],
            "command": call["command"],
            "files": sorted(call["files"]),
            "editable": {k: v for k, v in call["files"].items() if k in s["json"]["files"]},
        }
    runner.calls.clear()
    return out


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with app.router.lifespan_context(app):
        runner = FakeRunner()
        app.state.runner = runner
        steps = scenario(app.state.content)
        golden = []
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            for s in steps:
                if s.get("runner"):
                    runner.exit_code, runner.output = s["runner"]["exit_code"], s["runner"]["output"]
                kw = {}
                if "json" in s:
                    kw["json"] = s["json"]
                if "body_b64" in s:
                    kw["content"] = base64.b64decode(s["body_b64"])
                r = await c.request(s["method"], s["path"], **kw)
                golden.append(record(s, r, runner))
    await engine.dispose()

    OUT.mkdir(parents=True, exist_ok=True)
    dump = {"ensure_ascii": False, "indent": 1}
    (OUT / "scenario.json").write_text(json.dumps(steps, **dump) + "\n", encoding="utf-8")
    (OUT / "golden.json").write_text(json.dumps(golden, **dump) + "\n", encoding="utf-8")
    print(f"{len(steps)} étapes enregistrées dans {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
