"""Exercices de diagramme : on vérifie un graphe d'architecture (blocs + flèches) contre des règles déclaratives.

Le graphe est un JSON produit par l'éditeur de nœuds :
    {"nodes": [{"id": "n1", "type": "bid-capture", "x": 0, "y": 0}], "edges": [{"source": "n1", "target": "n2"}]}
Une flèche va de l'appelant vers l'appelé, dans le sens où circulent les données.
Aucun code n'est exécuté : la vérification se fait dans le process API, en Python pur.

Usage (vérification d'un exercice, appelé par verify_lab.sh) :
    uv run python -m app.services.diagram verify <dossier_du_lab>
"""

import json
import sys
from collections import deque
from pathlib import Path

import yaml
from pydantic import BaseModel, ConfigDict, ValidationError

from app.content.models import DiagramCheck
from app.services.test_report import TestCase, TestReport

MAX_NODES = 60
MAX_EDGES = 200


class DiagramError(Exception):
    pass


class _Node(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    type: str


class _Edge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    source: str
    target: str


class Graph(BaseModel):
    model_config = ConfigDict(extra="ignore")
    nodes: list[_Node] = []
    edges: list[_Edge] = []


def parse_graph(raw: str) -> Graph:
    try:
        graph = Graph.model_validate(json.loads(raw))
    except (json.JSONDecodeError, ValidationError) as e:
        raise DiagramError(f"diagramme illisible : {e}") from e
    if len(graph.nodes) > MAX_NODES or len(graph.edges) > MAX_EDGES:
        raise DiagramError(f"diagramme trop grand (max {MAX_NODES} blocs, {MAX_EDGES} flèches)")
    ids = {n.id for n in graph.nodes}
    if len(ids) != len(graph.nodes):
        raise DiagramError("deux blocs portent le même id")
    if any(e.source not in ids or e.target not in ids for e in graph.edges):
        raise DiagramError("une flèche relie un bloc qui n'existe pas")
    return graph


class _View:
    """Accès pratiques au graphe : types, successeurs, prédécesseurs."""

    def __init__(self, g: Graph):
        self.type = {n.id: n.type for n in g.nodes}
        self.succ: dict[str, set[str]] = {n.id: set() for n in g.nodes}
        self.pred: dict[str, set[str]] = {n.id: set() for n in g.nodes}
        for e in g.edges:
            if e.source != e.target:
                self.succ[e.source].add(e.target)
                self.pred[e.target].add(e.source)

    def of(self, t: str) -> list[str]:
        return [n for n, nt in self.type.items() if nt == t]

    def reachable(self, starts: list[str], avoid_through: str | None = None) -> set[str]:
        """Blocs atteignables depuis `starts`. Avec `avoid_through`, on ne traverse jamais un bloc de ce type."""
        seen = set(starts)
        queue = deque(starts)
        while queue:
            n = queue.popleft()
            for m in self.succ[n]:
                if m in seen:
                    continue
                seen.add(m)
                if avoid_through is None or self.type[m] != avoid_through:
                    queue.append(m)
        return seen


def _name(t: str, labels: dict[str, str]) -> str:
    return labels.get(t, t)


def _check(v: _View, c: DiagramCheck, labels: dict[str, str]) -> str | None:
    """Renvoie None si la règle est respectée, sinon ce qui manque, en français."""
    if c.rule == "path":
        froms, tos = v.of(c.source or ""), set(v.of(c.target or ""))
        if not froms:
            return f"Aucun bloc « {_name(c.source or '', labels)} » sur le diagramme."
        if not tos:
            return f"Aucun bloc « {_name(c.target or '', labels)} » sur le diagramme."
        reached = v.reachable(froms)
        if not reached & tos:
            return f"Aucun chemin de « {_name(c.source or '', labels)} » vers « {_name(c.target or '', labels)} »."
        if c.via:
            # Tous les chemins doivent traverser `via` : on cherche une cible atteignable en l'évitant.
            if not v.of(c.via):
                return f"Aucun bloc « {_name(c.via, labels)} » sur le diagramme."
            if (v.reachable(froms, avoid_through=c.via) - set(froms)) & tos:
                return f"Un chemin va de « {_name(c.source or '', labels)} » à « {_name(c.target or '', labels)} » sans passer par « {_name(c.via, labels)} »."
        return None

    if c.rule == "no_edge":
        for a in v.of(c.source or ""):
            for b in v.succ[a]:
                if v.type[b] == c.target:
                    return f"Une flèche relie directement « {_name(c.source or '', labels)} » à « {_name(c.target or '', labels)} »."
        return None

    if c.rule == "inbound_via":
        targets = v.of(c.target or "")
        if not targets:
            return f"Aucun bloc « {_name(c.target or '', labels)} » sur le diagramme."
        for t in targets:
            if not v.pred[t]:
                return f"Rien n'arrive dans « {_name(c.target or '', labels)} »."
            direct = [p for p in v.pred[t] if v.type[p] != c.via]
            if direct:
                return f"« {_name(v.type[direct[0]], labels)} » entre dans « {_name(c.target or '', labels)} » sans passer par « {_name(c.via or '', labels)} »."
        return None

    if c.rule == "single_owner":
        for n in v.of(c.target or ""):
            if len(v.pred[n]) > 1:
                owners = sorted(_name(v.type[p], labels) for p in v.pred[n])
                return f"Une « {_name(c.target or '', labels)} » est partagée par : {', '.join(owners)}."
        return None

    if c.rule == "connected":
        alone = [n for n in v.type if not v.succ[n] and not v.pred[n]]
        if alone:
            return f"« {_name(v.type[alone[0]], labels)} » n'est relié à rien."
        return None

    raise DiagramError(f"règle inconnue : {c.rule}")


def evaluate(graph: Graph, checks: list[DiagramCheck], labels: dict[str, str]) -> TestReport:
    v = _View(graph)
    cases = []
    for c in checks:
        problem = _check(v, c, labels)
        cases.append(TestCase(name=c.label, status="fail" if problem else "pass", output=problem or ""))
    return TestReport(passed=all(t.status == "pass" for t in cases), tests=cases)


def load_checks(lab_dir: Path) -> list[DiagramCheck]:
    raw = yaml.safe_load((lab_dir / "tests" / "checks.yaml").read_text(encoding="utf-8")) or {}
    return [DiagramCheck(**c) for c in raw.get("checks", [])]


def _verify(lab_dir: Path) -> int:
    meta = yaml.safe_load((lab_dir / "lab.yaml").read_text(encoding="utf-8"))
    labels = {p["type"]: p["label"] for p in meta.get("palette", [])}
    checks = load_checks(lab_dir)
    results = {}
    for side in ("solution", "starter"):
        report = evaluate(
            parse_graph((lab_dir / side / "diagram.json").read_text(encoding="utf-8")), checks, labels
        )
        results[side] = "pass" if report.passed else "fail"
        print(f"== {side}")
        for t in report.tests:
            print(f"  {'✓' if t.status == 'pass' else '✗'} {t.name}{'  — ' + t.output if t.output else ''}")
    print(f"\nsolution: {results['solution']}   starter: {results['starter']}")
    return 0 if results == {"solution": "pass", "starter": "fail"} else 1


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] != "verify":
        print("usage: python -m app.services.diagram verify <lab_dir>", file=sys.stderr)
        sys.exit(2)
    sys.exit(_verify(Path(sys.argv[2]).resolve()))
