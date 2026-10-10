from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import exercise_or_404, get_content, get_exercise_service
from app.content.loader import ContentIndex
from app.content.models import Exercise
from app.schemas.api import FilesIn
from app.services.exercises import ExerciseError, ExerciseService
from app.services.runner_client import RunnerError

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("")
async def sandbox(
    content: ContentIndex = Depends(get_content), svc: ExerciseService = Depends(get_exercise_service)
) -> list[dict]:
    """Exercices de l'atelier : hors module, pour s'entraîner sur un format (diagramme…)."""
    return await svc.sandbox(content)


@router.get("/{exercise_id}")
async def get_exercise(
    ex: Exercise = Depends(exercise_or_404), svc: ExerciseService = Depends(get_exercise_service)
) -> dict:
    return {
        "id": ex.id,
        "title": ex.title,
        "role": ex.role,
        "kind": ex.kind,
        "language": ex.language,
        "difficulty": ex.difficulty,
        "xp": ex.xp,
        "chapter_id": ex.chapter_id,
        "lesson_id": ex.lesson_id,
        "concepts": ex.concepts,
        "instructions": ex.instructions,
        "milestones": ex.milestones,
        "rubric": ex.rubric,
        "source": ex.source.model_dump() if ex.source else None,
        "palette": [p.model_dump() for p in ex.palette],
        "checks": [{"id": c.id, "label": c.label} for c in ex.diagram_checks],
        "workspace": await svc.workspace(ex),
    }


@router.put("/{exercise_id}/draft", status_code=204)
async def save_draft(
    body: FilesIn,
    ex: Exercise = Depends(exercise_or_404),
    svc: ExerciseService = Depends(get_exercise_service),
) -> None:
    try:
        await svc.save_draft(ex, body.files)
    except ExerciseError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/{exercise_id}/reset", status_code=204)
async def reset(
    ex: Exercise = Depends(exercise_or_404), svc: ExerciseService = Depends(get_exercise_service)
):
    await svc.reset(ex)


@router.post("/{exercise_id}/hints")
async def reveal_hint(
    ex: Exercise = Depends(exercise_or_404), svc: ExerciseService = Depends(get_exercise_service)
) -> dict:
    return {"hints": await svc.reveal_hint(ex), "hints_total": len(ex.hints)}


@router.post("/{exercise_id}/run")
async def run(
    body: FilesIn,
    ex: Exercise = Depends(exercise_or_404),
    svc: ExerciseService = Depends(get_exercise_service),
) -> dict:
    try:
        report, xp = await svc.run(ex, body.files)
    except ExerciseError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RunnerError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return {**report.to_dict(), "xp_awarded": xp}
