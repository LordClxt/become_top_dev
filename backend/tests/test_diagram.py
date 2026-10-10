import json
from pathlib import Path

import pytest

from app.content.models import DiagramCheck
from app.services.diagram import DiagramError, evaluate, parse_graph

KATA = "arch-sandbox-ggg-bid-flow"
SOLUTION = (
    Path(__file__).parents[2] / "content/software-architecture/sandbox/ggg-bid-flow/solution/diagram.json"
)


def graph(edges: list[tuple[str, str]], extra: list[str] = ()) -> str:
    """Un bloc par nom (type = nom sans suffixe numérique), une flèche par couple."""
    names = {n for e in edges for n in e} | set(extra)
    return json.dumps(
        {
            "nodes": [{"id": n, "type": n.rstrip("0123456789")} for n in sorted(names)],
            "edges": [{"source": a, "target": b} for a, b in edges],
        }
    )


def check(rule: str, **kw) -> DiagramCheck:
    return DiagramCheck(id=rule, label=rule, rule=rule, **kw)


def status(raw: str, c: DiagramCheck) -> str:
    return evaluate(parse_graph(raw), [c], {}).tests[0].status


def test_path_via_requires_every_route_to_cross_via():
    c = check("path", source="api", target="db", via="queue")
    assert status(graph([("api", "queue"), ("queue", "db")]), c) == "pass"
    assert status(graph([("api", "queue"), ("queue", "db"), ("api", "db")]), c) == "fail"  # contournement
    assert status(graph([("api", "worker")], extra=["db", "queue"]), c) == "fail"  # aucun chemin


def test_inbound_via_and_no_edge():
    buffered = check("inbound_via", target="tracker", via="queue")
    assert status(graph([("a", "queue"), ("queue", "tracker")]), buffered) == "pass"
    assert status(graph([("a", "queue"), ("queue", "tracker"), ("b", "tracker")]), buffered) == "fail"
    stateless = check("no_edge", source="capture", target="db")
    assert status(graph([("capture", "queue")], extra=["db"]), stateless) == "pass"
    assert status(graph([("capture", "db")]), stateless) == "fail"


def test_single_owner_and_connected():
    owner = check("single_owner", target="db")
    assert status(graph([("svc1", "db1"), ("svc2", "db2")]), owner) == "pass"
    assert status(graph([("svc1", "db"), ("svc2", "db")]), owner) == "fail"
    connected = check("connected")
    assert status(graph([("a", "b")]), connected) == "pass"
    assert status(graph([("a", "b")], extra=["c"]), connected) == "fail"


def test_rejects_malformed_graphs():
    with pytest.raises(DiagramError):
        parse_graph("pas du json")
    with pytest.raises(DiagramError):
        parse_graph(
            json.dumps({"nodes": [{"id": "a", "type": "x"}], "edges": [{"source": "a", "target": "z"}]})
        )


async def test_sandbox_lists_the_kata_without_exposing_checks_file(auth_client):
    sandbox = (await auth_client.get("/api/exercises")).json()
    assert any(e["id"] == KATA and e["kind"] == "diagram" for e in sandbox)

    ex = (await auth_client.get(f"/api/exercises/{KATA}")).json()
    assert ex["palette"] and len(ex["checks"]) == 8
    assert set(ex["workspace"]["editable"]) == {"diagram.json"}
    assert not any(name.startswith("tests/") for name in ex["workspace"]["readonly"])


async def test_diagram_run_checks_rules_without_runner_and_awards_xp_once(auth_client):
    starter = (await auth_client.get(f"/api/exercises/{KATA}")).json()["workspace"]["editable"]
    failed = (await auth_client.post(f"/api/exercises/{KATA}/run", json={"files": starter})).json()
    assert failed["passed"] is False and failed["xp_awarded"] == 0

    solution = {"diagram.json": SOLUTION.read_text(encoding="utf-8")}
    first = (await auth_client.post(f"/api/exercises/{KATA}/run", json={"files": solution})).json()
    again = (await auth_client.post(f"/api/exercises/{KATA}/run", json={"files": solution})).json()
    assert first["passed"] is True and first["xp_awarded"] == 120 and again["xp_awarded"] == 0
    assert auth_client.runner.calls == []  # aucun conteneur pour un diagramme

    bad = await auth_client.post(f"/api/exercises/{KATA}/run", json={"files": {"diagram.json": "{"}})
    assert bad.status_code == 400
