from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_repo, quiz_or_404
from app.content.models import Quiz
from app.models.progress import QuizAnswer
from app.repositories.progress import ProgressRepository
from app.schemas.api import AnswerIn, AnswerOut
from app.services.progress import QUIZ_XP_PER_QUESTION
from app.services.quiz import UngradableQuestion, is_correct

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


@router.get("/{quiz_id}")
async def get_quiz(quiz: Quiz = Depends(quiz_or_404), repo: ProgressRepository = Depends(get_repo)) -> dict:
    first = await repo.first_attempts()
    return {
        "id": quiz.id,
        "lesson_id": quiz.lesson_id,
        "questions": [
            {
                "id": q.id,
                "type": q.type,
                "prompt": q.prompt,
                "code": q.code,
                "choices": q.choices,
                "difficulty": q.difficulty,
                "answered": (quiz.id, q.id) in first,
            }
            for q in quiz.questions
        ],
    }


@router.post("/{quiz_id}/questions/{question_id}")
async def answer(
    question_id: str,
    body: AnswerIn,
    quiz: Quiz = Depends(quiz_or_404),
    repo: ProgressRepository = Depends(get_repo),
) -> AnswerOut:
    q = next((q for q in quiz.questions if q.id == question_id), None)
    if q is None:
        raise HTTPException(status_code=404, detail="question introuvable")
    try:
        correct = is_correct(q, body.answer)
    except UngradableQuestion as e:
        raise HTTPException(
            status_code=400, detail=f"type de question non corrigé automatiquement : {e}"
        ) from e

    first_attempt = not await repo.has_answered(quiz.id, q.id)
    await repo.add_answer(
        QuizAnswer(
            quiz_id=quiz.id,
            question_id=q.id,
            answer=body.answer,
            correct=correct,
            first_attempt=first_attempt,
        )
    )
    xp = 0
    if correct and first_attempt:
        xp = await repo.award_xp("quiz", f"{quiz.id}/{q.id}", QUIZ_XP_PER_QUESTION)
    await repo.commit()
    return AnswerOut(correct=correct, expected=q.answer, explanation=q.explanation, xp_awarded=xp)
