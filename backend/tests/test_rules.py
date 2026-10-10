from datetime import date

from app.content.loader import load_content
from app.core.config import settings
from app.services.progress import (
    activity_start,
    exercise_xp,
    intensity,
    level_for_xp,
    longest_streak,
    streak,
    xp_for_level,
)
from app.services.quiz import is_correct
from app.services.test_report import parse_go_test_json
from tests.conftest import go_json


def test_real_content_is_valid():
    idx = load_content(settings.content_dir)
    assert "go-ch02" in idx.chapters
    assert all(ex.verified.solution == "pass" for ex in idx.exercises.values())


def test_levels():
    assert [xp_for_level(n) for n in (1, 2, 3, 4)] == [0, 100, 300, 600]
    assert level_for_xp(0) == 1
    assert level_for_xp(99) == 1
    assert level_for_xp(100) == 2
    assert level_for_xp(650) == 4


def test_hint_penalty():
    assert exercise_xp(50, 0) == 50
    assert exercise_xp(50, 1) == 40
    assert exercise_xp(50, 10) == 20  # plancher à 40 %


def test_streak():
    today = date(2026, 10, 10)
    assert streak([], today) == 0
    assert streak([date(2026, 10, 10), date(2026, 10, 9), date(2026, 10, 7)], today) == 2
    assert streak([date(2026, 10, 9), date(2026, 10, 8)], today) == 2  # hier compte encore
    assert streak([date(2026, 10, 7)], today) == 0


def test_longest_streak():
    assert longest_streak([]) == 0
    days = [date(2026, 10, 1), date(2026, 10, 2), date(2026, 10, 3), date(2026, 10, 7), date(2026, 10, 8)]
    assert longest_streak(days) == 3
    assert longest_streak([date(2026, 10, 1), date(2026, 10, 1)]) == 1  # doublons ignorés


def test_activity_intensity_and_start():
    assert intensity(0, 10) == 0
    assert intensity(1, 10) == 1  # toute activité est visible
    assert intensity(10, 10) == 4
    assert intensity(6, 10) == 3
    # Samedi 10 oct. 2026 : 26 semaines commencent un lundi.
    start = activity_start(date(2026, 10, 10), 26)
    assert start.weekday() == 0 and (date(2026, 10, 10) - start).days == 25 * 7 + 5


def test_quiz_grading():
    idx = load_content(settings.content_dir)
    quiz = idx.quizzes["go-ch02-l03-quiz"]
    by_id = {q.id: q for q in quiz.questions}
    assert is_correct(by_id["q2"], "[a b z d]")
    assert is_correct(by_id["q2"], "  [a b z d]\n")
    assert not is_correct(by_id["q2"], "[a b c d]")
    assert is_correct(by_id["q6"], 1)
    multiple = idx.quizzes["go-ch02-l01-quiz"].questions[4]
    assert is_correct(multiple, [2, 0])
    assert not is_correct(multiple, [0])


def test_parse_go_test_json():
    report = parse_go_test_json(go_json(("TestA", "pass"), ("TestB", "fail")), 1, False, 10)
    assert not report.passed
    assert [(t.name, t.status) for t in report.tests] == [("TestA", "pass"), ("TestB", "fail")]
    assert "mauvais résultat" in report.tests[1].output


def test_parse_build_error():
    raw = '{"ImportPath":"lab","Action":"build-output","Output":"./x.go:3:1: syntax error\\n"}\n'
    raw += '{"ImportPath":"lab","Action":"build-fail"}\nFAIL\tlab [build failed]\n'
    report = parse_go_test_json(raw, 1, False, 10)
    assert not report.passed
    assert "syntax error" in report.build_output
