"""Exercices : fichiers affichés dans l'IDE, brouillons, indices et exécution des tests."""

import re
import time
from datetime import UTC, datetime
from pathlib import Path

from app.content.loader import ContentIndex
from app.content.models import Exercise
from app.models.progress import ExerciseRun
from app.repositories.progress import ProgressRepository
from app.services.diagram import DiagramError, evaluate, parse_graph
from app.services.progress import exercise_xp
from app.services.runner_client import RunnerClient
from app.services.test_report import TestReport, parse_go_test_json

MAX_FILE_BYTES = 200_000


class ExerciseError(Exception):
    pass


def _read_dir(root: Path) -> dict[str, str]:
    return {
        str(p.relative_to(root)): p.read_text(encoding="utf-8")
        for p in sorted(root.rglob("*"))
        if p.is_file()
    }


def _test_command(ex: Exercise) -> str:
    cmd = ex.test_command
    if ex.language == "go":
        flags = "-json" + (" -race" if "race" in ex.checks else "")
        cmd = re.sub(r"\bgo test\b", f"go test {flags}", cmd, count=1)
    return cmd


class ExerciseService:
    def __init__(self, repo: ProgressRepository, runner: RunnerClient):
        self.repo = repo
        self.runner = runner

    async def workspace(self, ex: Exercise) -> dict:
        """Ce que l'IDE affiche : fichiers modifiables (brouillon ou starter) et fichiers en lecture seule."""
        progress = await self.repo.exercise_progress(ex.id)
        starter = _read_dir(ex.path / "starter")
        draft = progress.draft or {}
        editable = {name: draft.get(name, starter[name]) for name in ex.files_editable}
        readonly = {name: body for name, body in starter.items() if name not in ex.files_editable}
        if ex.kind != "diagram":  # les règles d'un diagramme sont envoyées à part, lisibles (voir l'API)
            readonly |= {f"tests/{name}": body for name, body in _read_dir(ex.path / "tests").items()}
        return {
            "editable": editable,
            "readonly": readonly,
            "hints_total": len(ex.hints),
            "hints_revealed": ex.hints[: progress.hints_revealed],
            "attempts": progress.attempts,
            "passed": progress.passed_at is not None,
        }

    async def sandbox(self, content: ContentIndex) -> list[dict]:
        """Exercices de l'atelier, avec l'état de chacun."""
        progress = await self.repo.all_exercise_progress()
        out = []
        for ex_id in content.sandbox:
            ex = content.exercises[ex_id]
            p = progress.get(ex.id)
            out.append(
                {
                    "id": ex.id,
                    "title": ex.title,
                    "kind": ex.kind,
                    "difficulty": ex.difficulty,
                    "xp": ex.xp,
                    "course": {"id": ex.course_id, "title": content.courses[ex.course_id].title},
                    "source": ex.source.model_dump() if ex.source else None,
                    "passed": bool(p and p.passed_at),
                    "attempts": p.attempts if p else 0,
                }
            )
        return out

    async def save_draft(self, ex: Exercise, files: dict[str, str]) -> None:
        progress = await self.repo.exercise_progress(ex.id)
        progress.draft = self._editable_only(ex, files)
        await self.repo.commit()

    async def reveal_hint(self, ex: Exercise) -> list[str]:
        progress = await self.repo.exercise_progress(ex.id)
        if progress.hints_revealed < len(ex.hints):
            progress.hints_revealed += 1
            await self.repo.commit()
        return ex.hints[: progress.hints_revealed]

    async def reset(self, ex: Exercise) -> None:
        progress = await self.repo.exercise_progress(ex.id)
        progress.draft = None
        await self.repo.commit()

    async def run(self, ex: Exercise, files: dict[str, str]) -> tuple[TestReport, int]:
        """Exécute les tests sur le code soumis. Renvoie le rapport et l'XP gagnée."""
        user_files = self._editable_only(ex, files)
        if ex.kind == "diagram":
            report = self._check_diagram(ex, user_files)
        else:
            starter = _read_dir(ex.path / "starter")
            to_run = starter | user_files | _read_dir(ex.path / "tests")
            raw = await self.runner.run(ex.language, to_run, _test_command(ex), ex.timeout_s)
            report = parse_go_test_json(raw["output"], raw["exit_code"], raw["timed_out"], raw["duration_ms"])

        progress = await self.repo.exercise_progress(ex.id)
        progress.attempts += 1
        progress.draft = user_files
        xp = 0
        if report.passed:
            if progress.passed_at is None:
                progress.passed_at = datetime.now(UTC)
            xp = await self.repo.award_xp("exercise", ex.id, exercise_xp(ex.xp, progress.hints_revealed))
        await self.repo.add_run(
            ExerciseRun(
                exercise_id=ex.id,
                passed=report.passed,
                duration_ms=report.duration_ms,
                files=user_files,
                report=report.to_dict(),
            )
        )
        await self.repo.commit()
        return report, xp

    @staticmethod
    def _check_diagram(ex: Exercise, files: dict[str, str]) -> TestReport:
        """Un diagramme ne s'exécute pas : on vérifie ses règles en Python pur, sans passer par le runner."""
        started = time.perf_counter()
        try:
            graph = parse_graph(files.get("diagram.json", "{}"))
        except DiagramError as e:
            raise ExerciseError(str(e)) from e
        report = evaluate(graph, ex.diagram_checks, {p.type: p.label for p in ex.palette})
        report.duration_ms = round((time.perf_counter() - started) * 1000)
        return report

    @staticmethod
    def _editable_only(ex: Exercise, files: dict[str, str]) -> dict[str, str]:
        unknown = set(files) - set(ex.files_editable)
        if unknown:
            raise ExerciseError(f"fichiers non modifiables : {sorted(unknown)}")
        for name, body in files.items():
            if len(body.encode()) > MAX_FILE_BYTES:
                raise ExerciseError(f"{name} dépasse {MAX_FILE_BYTES} octets")
        return files
