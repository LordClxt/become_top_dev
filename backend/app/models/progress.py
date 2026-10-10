"""État de l'utilisateur. Le contenu n'est jamais en base : on ne stocke que des références par id."""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class XpEvent(Base):
    """Une attribution d'XP. (kind, ref_id) est unique : chaque récompense n'est donnée qu'une fois."""

    __tablename__ = "xp_events"
    __table_args__ = (UniqueConstraint("kind", "ref_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(32))
    ref_id: Mapped[str] = mapped_column(String(128))
    amount: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    lesson_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ExerciseProgress(Base):
    __tablename__ = "exercise_progress"

    exercise_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    draft: Mapped[dict[str, str] | None] = mapped_column(JSON, nullable=True)
    hints_revealed: Mapped[int] = mapped_column(Integer, default=0)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    passed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ExerciseRun(Base):
    __tablename__ = "exercise_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    exercise_id: Mapped[str] = mapped_column(String(128), index=True)
    passed: Mapped[bool]
    duration_ms: Mapped[int] = mapped_column(Integer)
    files: Mapped[dict[str, str]] = mapped_column(JSON)
    report: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class QuizAnswer(Base):
    """Chaque réponse donnée. La première tentative par question compte pour le score de maîtrise."""

    __tablename__ = "quiz_answers"

    id: Mapped[int] = mapped_column(primary_key=True)
    quiz_id: Mapped[str] = mapped_column(String(128), index=True)
    question_id: Mapped[str] = mapped_column(String(64))
    answer: Mapped[Any] = mapped_column(JSON)
    correct: Mapped[bool]
    first_attempt: Mapped[bool]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
