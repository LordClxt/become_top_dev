"""Transforme la sortie de `go test -json` en rapport lisible par le frontend."""

import json
from dataclasses import asdict, dataclass, field


@dataclass
class TestCase:
    __test__ = False  # pas une classe de test pytest

    name: str
    status: str = "run"  # pass | fail | skip | run
    output: str = ""


@dataclass
class TestReport:
    __test__ = False

    passed: bool
    tests: list[TestCase] = field(default_factory=list)
    build_output: str = ""
    timed_out: bool = False
    duration_ms: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


def parse_go_test_json(raw: str, exit_code: int, timed_out: bool, duration_ms: int) -> TestReport:
    tests: dict[str, TestCase] = {}
    build: list[str] = []
    for line in raw.splitlines():
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            if line.strip():
                build.append(line)
            continue
        if not isinstance(ev, dict):
            build.append(line)
            continue
        action, name, output = ev.get("Action"), ev.get("Test"), ev.get("Output", "")
        if action == "build-output":
            build.append(output.rstrip("\n"))
            continue
        if not name:
            continue
        case = tests.setdefault(name, TestCase(name=name))
        if action == "output" and not output.startswith(("=== RUN", "=== PAUSE", "=== CONT", "--- ")):
            case.output += output
        elif action in ("pass", "fail", "skip"):
            case.status = action

    # On garde les sous-tests (Parent/Sub) ; seuls les tests en échec gardent leur sortie.
    cases = list(tests.values())  # ordre d'exécution
    for c in cases:
        c.output = c.output.strip() if c.status == "fail" else ""
    passed = exit_code == 0 and not timed_out and all(c.status != "fail" for c in cases)
    return TestReport(
        passed=passed,
        tests=cases,
        build_output="\n".join(build).strip(),
        timed_out=timed_out,
        duration_ms=duration_ms,
    )
