from typing import Any

from app.content.models import QuizQuestion


class UngradableQuestion(Exception):
    pass


def _normalize_output(text: str) -> str:
    return "\n".join(line.rstrip() for line in str(text).strip().splitlines())


def is_correct(q: QuizQuestion, answer: Any) -> bool:
    match q.type:
        case "single":
            return answer == q.answer
        case "multiple":
            return isinstance(answer, list) and sorted(answer) == sorted(q.answer)
        case "order":
            return answer == q.answer
        case "code-output":
            return _normalize_output(answer) == _normalize_output(q.answer)
        case _:
            raise UngradableQuestion(q.type)
