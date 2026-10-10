from tests.conftest import go_json

LAB = "go-ch02-l03-lab-chunk"


async def test_requires_login(client):
    assert (await client.get("/api/courses")).status_code == 401
    assert (await client.post("/api/auth/login", json={"password": "faux"})).status_code == 401


async def test_courses_and_chapter(auth_client):
    courses = (await auth_client.get("/api/courses")).json()
    chapters = [c for t in courses[0]["tracks"] for c in t["chapters"]]
    by_id = {c["id"]: c for c in chapters if c.get("id")}
    assert by_id["go-ch00"]["mastery"]["unlocked"] is True
    assert by_id["go-ch02"]["mastery"]["unlocked"] is False  # débloqué par la maîtrise du module précédent
    assert any(not c["available"] for c in chapters)  # chapitres prévus mais pas encore générés

    chapter = (await auth_client.get("/api/chapters/go-ch02")).json()
    assert len(chapter["lessons"]) == 6
    assert chapter["boss"]["id"] == "go-ch02-boss"


async def test_lesson_completion_awards_xp_once(auth_client):
    lesson = (await auth_client.get("/api/lessons/go-ch02-l03")).json()
    assert "::visual" in lesson["body"]
    assert lesson["previous_id"] == "go-ch02-l02"
    first = (await auth_client.post("/api/lessons/go-ch02-l03/complete")).json()
    again = (await auth_client.post("/api/lessons/go-ch02-l03/complete")).json()
    assert first["xp_awarded"] == 40 and again["xp_awarded"] == 0


async def test_quiz_hides_answers_and_scores_first_attempt(auth_client):
    quiz = (await auth_client.get("/api/quizzes/go-ch02-l03-quiz")).json()
    assert "answer" not in quiz["questions"][0]

    wrong = (
        await auth_client.post("/api/quizzes/go-ch02-l03-quiz/questions/q2", json={"answer": "?"})
    ).json()
    right = (
        await auth_client.post("/api/quizzes/go-ch02-l03-quiz/questions/q2", json={"answer": "[a b z d]"})
    ).json()
    assert wrong["correct"] is False and wrong["expected"] == "[a b z d]"
    assert right["correct"] is True and right["xp_awarded"] == 0  # seule la 1re tentative rapporte

    good = await auth_client.post("/api/quizzes/go-ch02-l03-quiz/questions/q1", json={"answer": "[1 20 3 4]"})
    assert good.json()["xp_awarded"] == 5


async def test_exercise_workspace_never_exposes_solution(auth_client):
    ex = (await auth_client.get(f"/api/exercises/{LAB}")).json()
    ws = ex["workspace"]
    assert set(ws["editable"]) == {"chunk.go"}
    assert "tests/chunk_test.go" in ws["readonly"]
    assert "ids[i:end:end]" not in str(ws)  # le code de la solution
    assert ws["hints_revealed"] == [] and ws["hints_total"] == 3


async def test_run_pass_awards_xp_with_hint_penalty(auth_client):
    await auth_client.post(f"/api/exercises/{LAB}/hints")
    auth_client.runner.output = go_json(("TestChunkValues", "pass"))
    body = (
        await auth_client.post(f"/api/exercises/{LAB}/run", json={"files": {"chunk.go": "package lab"}})
    ).json()
    assert body["passed"] is True
    assert body["xp_awarded"] == 56  # 70 XP − 20 % pour un indice

    call = auth_client.runner.calls[0]
    assert call["command"] == "go test -json ./..."
    assert call["files"]["chunk.go"] == "package lab"
    assert "chunk_test.go" in call["files"] and "go.mod" in call["files"]

    again = (await auth_client.post(f"/api/exercises/{LAB}/run", json={"files": {"chunk.go": "x"}})).json()
    assert again["xp_awarded"] == 0


async def test_run_failure_keeps_draft(auth_client):
    auth_client.runner.exit_code = 1
    auth_client.runner.output = go_json(("TestChunkValues", "fail"))
    body = (
        await auth_client.post(f"/api/exercises/{LAB}/run", json={"files": {"chunk.go": "mon code"}})
    ).json()
    assert body["passed"] is False and body["tests"][0]["status"] == "fail"
    ws = (await auth_client.get(f"/api/exercises/{LAB}")).json()["workspace"]
    assert ws["editable"]["chunk.go"] == "mon code" and ws["attempts"] == 1


async def test_cannot_overwrite_tests(auth_client):
    r = await auth_client.post(f"/api/exercises/{LAB}/run", json={"files": {"tests/chunk_test.go": "x"}})
    assert r.status_code == 400


async def test_progress_summary(auth_client):
    await auth_client.post("/api/lessons/go-ch02-l01/complete")
    summary = (await auth_client.get("/api/progress")).json()
    assert summary["xp"] == 20 and summary["level"] == 1 and summary["streak_days"] == 1
    assert summary["longest_streak_days"] == 1 and summary["active_days"] == 1
    assert summary["chapters"]["go-ch02"]["lessons_done"] == 1


async def test_activity_graph_and_feed(auth_client):
    empty = (await auth_client.get("/api/activity", params={"weeks": 26, "tz": "Europe/Paris"})).json()
    assert empty[0]["date"] < empty[-1]["date"] and all(d["level"] == 0 for d in empty)
    assert 176 <= len(empty) <= 182  # 25 semaines pleines + la semaine en cours

    await auth_client.post("/api/lessons/go-ch02-l03/complete")
    auth_client.runner.output = go_json(("TestChunkValues", "fail"))
    await auth_client.post(f"/api/exercises/{LAB}/run", json={"files": {"chunk.go": "package lab"}})
    auth_client.runner.output = go_json(("TestChunkValues", "pass"))
    await auth_client.post(f"/api/exercises/{LAB}/run", json={"files": {"chunk.go": "package lab"}})

    today = (await auth_client.get("/api/activity", params={"tz": "Europe/Paris"})).json()[-1]
    assert today["lessons"] == 1 and today["runs"] == 2 and today["runs_passed"] == 1
    assert today["xp"] == 40 + 70 and today["level"] == 4

    feed = (await auth_client.get("/api/activity/feed", params={"tz": "Europe/Paris"})).json()
    kinds = {e["kind"]: e for e in feed}
    assert set(kinds) == {"lesson_completed", "exercise_passed", "exercise_runs"}
    assert kinds["exercise_runs"]["count"] == 2 and kinds["exercise_runs"]["ok"] == 1
    assert kinds["lesson_completed"]["target"] == {"type": "lesson", "id": "go-ch02-l03"}

    other_day = (await auth_client.get("/api/activity/feed", params={"day": "2020-01-01"})).json()
    assert other_day == []
    assert (await auth_client.get("/api/activity", params={"tz": "Mars/Olympus"})).status_code == 400


async def test_catalog_is_public_and_lists_requirements(client):
    catalog = (await client.get("/api/catalog")).json()
    assert [c["id"] for c in catalog] == ["go", "ddia", "arch"]
    ddia = catalog[1]
    assert ddia["book"]["authors"] == ["Martin Kleppmann"]
    assert ddia["requires"][0]["course_id"] == "go" and ddia["requires"][0]["met"] is False
    assert "mastery" not in catalog[0]["tracks"][0]["chapters"][2]


PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


async def test_avatar_upload_roundtrip(auth_client):
    assert (await auth_client.get("/api/profile")).json() == {"avatar_version": None}
    assert (await auth_client.get("/api/profile/avatar")).status_code == 404

    assert (await auth_client.put("/api/profile/avatar", content=PNG)).status_code == 204
    assert (await auth_client.get("/api/profile")).json()["avatar_version"] is not None
    got = await auth_client.get("/api/profile/avatar")
    assert got.content == PNG and got.headers["content-type"] == "image/png"

    assert (await auth_client.delete("/api/profile/avatar")).status_code == 204
    assert (await auth_client.get("/api/profile")).json() == {"avatar_version": None}


async def test_avatar_rejects_bad_files(auth_client):
    assert (await auth_client.put("/api/profile/avatar", content=b"<svg onload=x>")).status_code == 415
    assert (await auth_client.put("/api/profile/avatar", content=b"")).status_code == 400
    big = PNG + b"\x00" * (2 * 1024 * 1024)
    assert (await auth_client.put("/api/profile/avatar", content=big)).status_code == 413


async def test_avatar_requires_login(client):
    assert (await client.put("/api/profile/avatar", content=PNG)).status_code == 401
