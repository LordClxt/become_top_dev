"""Règles d'XP, de niveau, de série de jours et de maîtrise."""

from dataclasses import dataclass
from datetime import date, timedelta

from app.content.loader import ContentIndex
from app.content.models import Chapter
from app.repositories.progress import ProgressRepository

QUIZ_XP_PER_QUESTION = 5
HINT_PENALTY = 0.2
MIN_XP_RATIO = 0.4


def exercise_xp(base: int, hints_revealed: int) -> int:
    """Chaque indice dévoilé retire 20 % de l'XP, sans descendre sous 40 %."""
    return round(base * max(MIN_XP_RATIO, 1 - HINT_PENALTY * hints_revealed))


def xp_for_level(level: int) -> int:
    """XP cumulée nécessaire pour atteindre un niveau : 0, 100, 300, 600, 1000…"""
    return 50 * level * (level - 1)


def level_for_xp(xp: int) -> int:
    level = 1
    while xp >= xp_for_level(level + 1):
        level += 1
    return level


def streak(active_days: list[date], today: date) -> int:
    """Nombre de jours consécutifs avec de l'activité, se terminant aujourd'hui ou hier."""
    days = set(active_days)
    start = today if today in days else today - timedelta(days=1)
    count = 0
    while start - timedelta(days=count) in days:
        count += 1
    return count


def longest_streak(active_days: list[date]) -> int:
    """Plus longue suite de jours consécutifs avec de l'activité."""
    best = run = 0
    previous: date | None = None
    for day in sorted(set(active_days)):
        run = run + 1 if previous and day - previous == timedelta(days=1) else 1
        best = max(best, run)
        previous = day
    return best


def intensity(total: int, peak: int) -> int:
    """Niveau 0–4 d'une case du graphe, relatif au jour le plus actif (comme GitHub)."""
    if total <= 0 or peak <= 0:
        return 0
    return min(4, max(1, -(-total * 4 // peak)))


def activity_start(today: date, weeks: int) -> date:
    """Lundi de la plus ancienne semaine affichée : le graphe commence toujours par une colonne pleine."""
    return today - timedelta(days=today.weekday()) - timedelta(weeks=weeks - 1)


@dataclass
class ChapterMastery:
    chapter_id: str
    labs_passed: int
    labs_total: int
    quiz_correct: int
    quiz_total: int
    lessons_done: int
    lessons_total: int
    score: float
    mastered: bool
    unlocked: bool


class ProgressService:
    def __init__(self, repo: ProgressRepository, content: ContentIndex):
        self.repo = repo
        self.content = content

    async def chapter_mastery(self) -> dict[str, ChapterMastery]:
        exercises = await self.repo.all_exercise_progress()
        first = await self.repo.first_attempts()
        lessons_done = await self.repo.completed_lessons()

        out: dict[str, ChapterMastery] = {}
        for course in self.content.courses.values():
            previous_mastered = True
            for chapter_id in course.chapter_ids:
                m = self._mastery(self.content.chapters[chapter_id], exercises, first, lessons_done)
                m.unlocked = previous_mastered
                previous_mastered = m.mastered
                out[chapter_id] = m
        return out

    def _mastery(self, chapter: Chapter, exercises, first, lessons_done) -> ChapterMastery:
        lab_ids = [lab for lid in chapter.lesson_ids for lab in self.content.lessons[lid].labs]
        labs_passed = sum(1 for lab in lab_ids if lab in exercises and exercises[lab].passed_at)
        questions = [
            (q.id, quiz.id)
            for lid in chapter.lesson_ids
            if (quiz := self.content.quizzes.get(self.content.lessons[lid].quiz_id or ""))
            for q in quiz.questions
        ]
        quiz_correct = sum(1 for qid, quiz_id in questions if first.get((quiz_id, qid)))
        lab_ratio = labs_passed / len(lab_ids) if lab_ids else 1.0
        quiz_ratio = quiz_correct / len(questions) if questions else 1.0
        score = round((lab_ratio + quiz_ratio) / 2, 3)
        return ChapterMastery(
            chapter_id=chapter.id,
            labs_passed=labs_passed,
            labs_total=len(lab_ids),
            quiz_correct=quiz_correct,
            quiz_total=len(questions),
            lessons_done=sum(1 for lid in chapter.lesson_ids if lid in lessons_done),
            lessons_total=len(chapter.lesson_ids),
            score=score,
            mastered=score >= chapter.mastery_threshold,
            unlocked=False,
        )

    async def summary(self, today: date, tz: str = "UTC") -> dict:
        xp = await self.repo.total_xp()
        level = level_for_xp(xp)
        days = await self.repo.active_days(tz)
        return {
            "xp": xp,
            "level": level,
            "level_floor_xp": xp_for_level(level),
            "next_level_xp": xp_for_level(level + 1),
            "streak_days": streak(days, today),
            "longest_streak_days": longest_streak(days),
            "active_days": len(days),
            "chapters": {k: v.__dict__ for k, v in (await self.chapter_mastery()).items()},
        }

    async def activity(self, today: date, weeks: int, tz: str) -> list[dict]:
        """Une entrée par jour, du lundi de la plus ancienne semaine jusqu'à aujourd'hui."""
        since = activity_start(today, weeks)
        days: dict[date, dict] = {}
        for offset in range((today - since).days + 1):
            d = since + timedelta(days=offset)
            days[d] = {
                "date": d.isoformat(),
                "lessons": 0,
                "runs": 0,
                "runs_passed": 0,
                "answers": 0,
                "xp": 0,
            }

        for kind, _ref, amount, _at, day in await self.repo.xp_events_since(since, tz):
            if day in days:
                days[day]["xp"] += amount
                days[day]["lessons"] += kind == "lesson"
        for _ex, day, count, passed, _last in await self.repo.runs_by_day(since, tz):
            if day in days:
                days[day]["runs"] += count
                days[day]["runs_passed"] += passed
        for _quiz, day, count, _correct, _last in await self.repo.answers_by_day(since, tz):
            if day in days:
                days[day]["answers"] += count

        totals = {d: e["lessons"] + e["runs"] + e["answers"] for d, e in days.items()}
        peak = max(totals.values(), default=0)
        return [{**e, "level": intensity(totals[d], peak)} for d, e in days.items()]

    async def feed(self, today: date, tz: str, day: date | None = None, limit: int = 50) -> list[dict]:
        """Journal façon git log : leçons et TP réussis, exécutions et quiz regroupés par jour."""
        since = day or today - timedelta(days=365)
        events: list[dict] = []
        quiz_xp: dict[tuple[str, date], int] = {}

        for kind, ref, amount, at, d in await self.repo.xp_events_since(since, tz):
            if kind == "quiz":
                key = (ref.split("/")[0], d)
                quiz_xp[key] = quiz_xp.get(key, 0) + amount
            elif kind == "lesson" and (lesson := self.content.lessons.get(ref)):
                events.append(_event("lesson_completed", at, d, lesson.title, "lesson", ref, xp=amount))
            elif kind == "exercise" and (ex := self.content.exercises.get(ref)):
                events.append(_event("exercise_passed", at, d, ex.title, "exercise", ref, xp=amount))

        for ex_id, d, count, passed, last in await self.repo.runs_by_day(since, tz):
            if ex := self.content.exercises.get(ex_id):
                events.append(
                    _event("exercise_runs", last, d, ex.title, "exercise", ex_id, count=count, ok=passed)
                )

        for quiz_id, d, count, correct, last in await self.repo.answers_by_day(since, tz):
            quiz = self.content.quizzes.get(quiz_id)
            lesson = self.content.lessons.get(quiz.lesson_id) if quiz else None
            if lesson:
                xp = quiz_xp.get((quiz_id, d), 0)
                events.append(
                    _event(
                        "quiz_answers",
                        last,
                        d,
                        lesson.title,
                        "lesson",
                        lesson.id,
                        xp=xp,
                        count=count,
                        ok=correct,
                    )
                )

        if day:
            events = [e for e in events if e["date"] == day.isoformat()]
        events.sort(key=lambda e: e["at"], reverse=True)
        return events[:limit]


def _event(kind: str, at, day: date, title: str, target: str, target_id: str, **extra) -> dict:
    return {
        "kind": kind,
        "at": at.isoformat(),
        "date": day.isoformat(),
        "title": title,
        "target": {"type": target, "id": target_id},
        "xp": extra.get("xp", 0),
        "count": extra.get("count", 1),
        "ok": extra.get("ok", 0),
    }
