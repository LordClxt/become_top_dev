from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.progress import ExerciseProgress, ExerciseRun, LessonProgress, QuizAnswer, XpEvent


def _local_day(col, tz: str):
    """Jour calendaire de l'horodatage dans le fuseau de l'utilisateur (sinon une session à 0 h 30 compte la veille)."""
    return func.date(func.timezone(tz, col))


class ProgressRepository:
    def __init__(self, session: AsyncSession):
        self.s = session

    async def commit(self) -> None:
        await self.s.commit()

    # --- XP ---------------------------------------------------------------

    async def award_xp(self, kind: str, ref_id: str, amount: int) -> int:
        """Attribue l'XP une seule fois par (kind, ref_id). Renvoie l'XP réellement gagnée."""
        stmt = (
            insert(XpEvent)
            .values(kind=kind, ref_id=ref_id, amount=amount)
            .on_conflict_do_nothing(index_elements=["kind", "ref_id"])
            .returning(XpEvent.amount)
        )
        result = await self.s.execute(stmt)
        return result.scalar_one_or_none() or 0

    async def total_xp(self) -> int:
        return (await self.s.execute(select(func.coalesce(func.sum(XpEvent.amount), 0)))).scalar_one()

    async def active_days(self, tz: str = "UTC") -> list[date]:
        """Jours avec au moins une action : XP gagnée, exécution de TP ou réponse de quiz."""
        days: set[date] = set()
        for col in (XpEvent.created_at, ExerciseRun.created_at, QuizAnswer.created_at):
            day = _local_day(col, tz)
            days.update(r[0] for r in await self.s.execute(select(day).group_by(day)))
        return sorted(days, reverse=True)

    # --- Activité ---------------------------------------------------------

    async def xp_events_since(self, since: date, tz: str) -> list[tuple[str, str, int, datetime, date]]:
        day = _local_day(XpEvent.created_at, tz)
        stmt = (
            select(XpEvent.kind, XpEvent.ref_id, XpEvent.amount, XpEvent.created_at, day)
            .where(day >= since)
            .order_by(XpEvent.created_at)
        )
        return [tuple(r) for r in await self.s.execute(stmt)]

    async def runs_by_day(self, since: date, tz: str) -> list[tuple[str, date, int, int, datetime]]:
        """(exercice, jour) → nombre d'exécutions, dont réussies, et heure de la dernière."""
        day = _local_day(ExerciseRun.created_at, tz)
        stmt = (
            select(
                ExerciseRun.exercise_id,
                day,
                func.count(),
                func.count().filter(ExerciseRun.passed.is_(True)),
                func.max(ExerciseRun.created_at),
            )
            .where(day >= since)
            .group_by(ExerciseRun.exercise_id, day)
        )
        return [tuple(r) for r in await self.s.execute(stmt)]

    async def answers_by_day(self, since: date, tz: str) -> list[tuple[str, date, int, int, datetime]]:
        """(quiz, jour) → nombre de réponses, dont correctes, et heure de la dernière."""
        day = _local_day(QuizAnswer.created_at, tz)
        stmt = (
            select(
                QuizAnswer.quiz_id,
                day,
                func.count(),
                func.count().filter(QuizAnswer.correct.is_(True)),
                func.max(QuizAnswer.created_at),
            )
            .where(day >= since)
            .group_by(QuizAnswer.quiz_id, day)
        )
        return [tuple(r) for r in await self.s.execute(stmt)]

    # --- Leçons -----------------------------------------------------------

    async def complete_lesson(self, lesson_id: str) -> None:
        await self.s.execute(insert(LessonProgress).values(lesson_id=lesson_id).on_conflict_do_nothing())

    async def completed_lessons(self) -> set[str]:
        return set((await self.s.execute(select(LessonProgress.lesson_id))).scalars())

    # --- Exercices --------------------------------------------------------

    async def exercise_progress(self, exercise_id: str) -> ExerciseProgress:
        progress = await self.s.get(ExerciseProgress, exercise_id)
        if progress is None:
            progress = ExerciseProgress(exercise_id=exercise_id, hints_revealed=0, attempts=0)
            self.s.add(progress)
        return progress

    async def all_exercise_progress(self) -> dict[str, ExerciseProgress]:
        rows = (await self.s.execute(select(ExerciseProgress))).scalars()
        return {p.exercise_id: p for p in rows}

    async def add_run(self, run: ExerciseRun) -> None:
        self.s.add(run)

    # --- Quiz -------------------------------------------------------------

    async def has_answered(self, quiz_id: str, question_id: str) -> bool:
        stmt = select(QuizAnswer.id).where(
            QuizAnswer.quiz_id == quiz_id, QuizAnswer.question_id == question_id
        )
        return (await self.s.execute(stmt.limit(1))).first() is not None

    async def add_answer(self, answer: QuizAnswer) -> None:
        self.s.add(answer)

    async def first_attempts(self) -> dict[tuple[str, str], bool]:
        """(quiz_id, question_id) → la première réponse était-elle correcte ?"""
        stmt = select(QuizAnswer.quiz_id, QuizAnswer.question_id, QuizAnswer.correct).where(
            QuizAnswer.first_attempt.is_(True)
        )
        return {(q, qid): ok for q, qid, ok in await self.s.execute(stmt)}
