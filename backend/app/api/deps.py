from collections.abc import AsyncIterator

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.loader import ContentIndex
from app.content.models import Exercise, Lesson, Quiz
from app.core.db import get_session
from app.repositories.profile import ProfileRepository
from app.repositories.progress import ProgressRepository
from app.services.exercises import ExerciseService
from app.services.profile import ProfileService
from app.services.progress import ProgressService
from app.services.runner_client import RunnerClient


def require_auth(request: Request) -> None:
    if not request.session.get("auth"):
        raise HTTPException(status_code=401, detail="non connecté")


def get_content(request: Request) -> ContentIndex:
    return request.app.state.content


def get_runner(request: Request) -> RunnerClient:
    return request.app.state.runner


async def get_repo(session: AsyncSession = Depends(get_session)) -> AsyncIterator[ProgressRepository]:
    yield ProgressRepository(session)


def get_progress_service(
    repo: ProgressRepository = Depends(get_repo), content: ContentIndex = Depends(get_content)
) -> ProgressService:
    return ProgressService(repo, content)


def get_exercise_service(
    repo: ProgressRepository = Depends(get_repo), runner: RunnerClient = Depends(get_runner)
) -> ExerciseService:
    return ExerciseService(repo, runner)


async def get_profile_service(session: AsyncSession = Depends(get_session)) -> ProfileService:
    return ProfileService(ProfileRepository(session))


def lesson_or_404(lesson_id: str, content: ContentIndex = Depends(get_content)) -> Lesson:
    if lesson_id not in content.lessons:
        raise HTTPException(status_code=404, detail="leçon introuvable")
    return content.lessons[lesson_id]


def exercise_or_404(exercise_id: str, content: ContentIndex = Depends(get_content)) -> Exercise:
    if exercise_id not in content.exercises:
        raise HTTPException(status_code=404, detail="exercice introuvable")
    return content.exercises[exercise_id]


def quiz_or_404(quiz_id: str, content: ContentIndex = Depends(get_content)) -> Quiz:
    if quiz_id not in content.quizzes:
        raise HTTPException(status_code=404, detail="quiz introuvable")
    return content.quizzes[quiz_id]
