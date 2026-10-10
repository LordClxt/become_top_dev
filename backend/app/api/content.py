"""Lecture du contenu : cours, chapitres, leçons. Jamais de solution ni de réponse de quiz."""

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_content, get_progress_service, get_repo, lesson_or_404
from app.content.loader import ContentIndex
from app.content.models import Lesson
from app.repositories.progress import ProgressRepository
from app.schemas.api import XpOut
from app.services.catalog import course_overview, ordered_courses
from app.services.progress import ProgressService

router = APIRouter(tags=["content"])


def _exercise_summary(content: ContentIndex, ex_id: str | None, passed: set[str]) -> dict | None:
    if not ex_id:
        return None
    ex = content.exercises[ex_id]
    return {
        "id": ex.id,
        "title": ex.title,
        "role": ex.role,
        "difficulty": ex.difficulty,
        "xp": ex.xp,
        "passed": ex.id in passed,
    }


async def _passed(repo: ProgressRepository) -> set[str]:
    return {k for k, p in (await repo.all_exercise_progress()).items() if p.passed_at}


@router.get("/courses")
async def courses(
    content: ContentIndex = Depends(get_content),
    progress: ProgressService = Depends(get_progress_service),
) -> list[dict]:
    mastery = await progress.chapter_mastery()
    return [course_overview(content, course, mastery) for course in ordered_courses(content)]


@router.get("/chapters/{chapter_id}")
async def chapter(
    chapter_id: str,
    content: ContentIndex = Depends(get_content),
    repo: ProgressRepository = Depends(get_repo),
    progress: ProgressService = Depends(get_progress_service),
) -> dict:
    ch = content.chapters.get(chapter_id)
    if ch is None:
        raise HTTPException(status_code=404, detail="chapitre introuvable")
    passed = await _passed(repo)
    done = await repo.completed_lessons()
    lessons = []
    for lid in ch.lesson_ids:
        lesson = content.lessons[lid]
        lessons.append(
            {
                "id": lesson.id,
                "title": lesson.title,
                "duration_min": lesson.duration_min,
                "xp": lesson.xp,
                "completed": lesson.id in done,
                "labs": [_exercise_summary(content, lab, passed) for lab in lesson.labs],
            }
        )
    course = content.courses[ch.course_id]
    return {
        "id": ch.id,
        "course": {"id": course.id, "title": course.title},
        "title": ch.title,
        "subtitle": ch.subtitle,
        "source": ch.source.model_dump(),
        "objectives": ch.objectives,
        "mastery_threshold": ch.mastery_threshold,
        "lessons": lessons,
        "assignment": _exercise_summary(content, ch.assignment_id, passed),
        "boss": _exercise_summary(content, ch.boss_id, passed),
        "project": _exercise_summary(content, ch.project_id, passed),
        "mastery": (await progress.chapter_mastery())[ch.id].__dict__,
    }


@router.get("/lessons/{lesson_id}")
async def lesson(
    lesson: Lesson = Depends(lesson_or_404),
    content: ContentIndex = Depends(get_content),
    repo: ProgressRepository = Depends(get_repo),
) -> dict:
    ch = content.chapters[lesson.chapter_id]
    pos = ch.lesson_ids.index(lesson.id)
    passed = await _passed(repo)
    return {
        "id": lesson.id,
        "title": lesson.title,
        "chapter": {"id": ch.id, "title": ch.title, "course_id": ch.course_id},
        "source": lesson.source.model_dump(),
        "duration_min": lesson.duration_min,
        "xp": lesson.xp,
        "extra": lesson.extra,
        "body": lesson.body,
        "concepts": [c.model_dump() for c in lesson.concepts],
        "glossary": [g.model_dump() for g in lesson.glossary],
        "visuals": {vid: content.visuals[vid].model_dump() for vid in lesson.visuals},
        "labs": [_exercise_summary(content, lab, passed) for lab in lesson.labs],
        "quiz_id": lesson.quiz_id,
        "flashcards": [f.model_dump() for f in lesson.flashcards],
        "completed": lesson.id in await repo.completed_lessons(),
        "previous_id": ch.lesson_ids[pos - 1] if pos > 0 else None,
        "next_id": ch.lesson_ids[pos + 1] if pos + 1 < len(ch.lesson_ids) else None,
    }


@router.post("/lessons/{lesson_id}/complete")
async def complete_lesson(
    lesson: Lesson = Depends(lesson_or_404), repo: ProgressRepository = Depends(get_repo)
) -> XpOut:
    await repo.complete_lesson(lesson.id)
    xp = await repo.award_xp("lesson", lesson.id, lesson.xp)
    await repo.commit()
    return XpOut(xp_awarded=xp)
