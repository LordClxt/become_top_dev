"""Charge et valide tout content/ au démarrage. Échoue bruyamment si le contenu est invalide."""

import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from app.content.models import Chapter, Course, DiagramCheck, Exercise, Flashcard, Lesson, Quiz, Visual

FRONT_MATTER = re.compile(r"\A---\n(.*?)\n---\n(.*)\Z", re.DOTALL)
HINT_SPLIT = re.compile(r"^## Hint \d+\s*$", re.MULTILINE)
VISUAL_DIRECTIVE = re.compile(r'::visual\{id="([^"]+)"\}')


class ContentError(Exception):
    pass


@dataclass
class ContentIndex:
    courses: dict[str, Course] = field(default_factory=dict)
    chapters: dict[str, Chapter] = field(default_factory=dict)
    lessons: dict[str, Lesson] = field(default_factory=dict)
    exercises: dict[str, Exercise] = field(default_factory=dict)
    quizzes: dict[str, Quiz] = field(default_factory=dict)
    visuals: dict[str, Visual] = field(default_factory=dict)
    # Exercices de l'atelier (content/<livre>/sandbox/) : hors module, pour s'entraîner.
    sandbox: list[str] = field(default_factory=list)


def _yaml(path: Path) -> dict:
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as e:
        raise ContentError(f"{path}: YAML invalide : {e}") from e


def _hints(path: Path) -> list[str]:
    if not path.exists():
        return []
    return [h.strip() for h in HINT_SPLIT.split(path.read_text(encoding="utf-8")) if h.strip()]


def _exercise(dir_: Path, meta_file: str, role: str, chapter_id: str, lesson_id: str | None) -> Exercise:
    meta = _yaml(dir_ / meta_file)
    for sub in ("starter", "solution", "tests"):
        if not (dir_ / sub).is_dir():
            raise ContentError(f"{dir_}: dossier {sub}/ manquant")
    for name in meta.get("files_editable", []):
        if not (dir_ / "starter" / name).is_file():
            raise ContentError(f"{dir_}: fichier modifiable {name} absent de starter/")
    if "verified" not in meta:
        raise ContentError(f"{dir_}: exercice non vérifié (lance verify_lab.sh)")
    rubric = _yaml(dir_ / "rubric.yaml").get("criteria", []) if (dir_ / "rubric.yaml").exists() else []
    milestones = (
        _yaml(dir_ / "milestones.yaml").get("milestones", []) if (dir_ / "milestones.yaml").exists() else []
    )
    diagram_checks = []
    if meta.get("kind") == "diagram":
        diagram_checks = _diagram_checks(dir_, meta)
    instructions = dir_ / "instructions.md"
    return Exercise(
        **meta,
        role=role,
        chapter_id=chapter_id,
        lesson_id=lesson_id,
        path=dir_,
        instructions=instructions.read_text(encoding="utf-8") if instructions.exists() else "",
        hints=_hints(dir_ / "hints.md"),
        rubric=rubric,
        milestones=milestones,
        diagram_checks=diagram_checks,
    )


def _diagram_checks(dir_: Path, meta: dict) -> list[DiagramCheck]:
    """Règles d'un exercice diagram : elles ne peuvent citer que des types de la palette."""
    checks_file = dir_ / "tests" / "checks.yaml"
    if not checks_file.exists():
        raise ContentError(f"{dir_}: tests/checks.yaml manquant (exercice diagram)")
    checks = [DiagramCheck(**c) for c in _yaml(checks_file).get("checks", [])]
    if not checks:
        raise ContentError(f"{dir_}: aucune règle dans tests/checks.yaml")
    types = {p["type"] for p in meta.get("palette", [])}
    for c in checks:
        for t in (c.source, c.target, c.via):
            if t is not None and t not in types:
                raise ContentError(f"{dir_}: la règle {c.id} cite le type {t}, absent de la palette")
    if meta.get("files_editable") != ["diagram.json"]:
        raise ContentError(f"{dir_}: un exercice diagram n'édite que diagram.json")
    return checks


def _lesson(dir_: Path, chapter_id: str, idx: ContentIndex) -> Lesson:
    raw = (dir_ / "lesson.md").read_text(encoding="utf-8")
    m = FRONT_MATTER.match(raw)
    if not m:
        raise ContentError(f"{dir_}/lesson.md: front-matter YAML manquant")
    meta = yaml.safe_load(m.group(1))
    lesson_id = meta["id"]

    for lab_dir in sorted((dir_ / "labs").glob("*/")) if (dir_ / "labs").exists() else []:
        ex = _exercise(lab_dir, "lab.yaml", "lab", chapter_id, lesson_id)
        idx.exercises[ex.id] = ex
    for vis_file in sorted(dir_.glob("visuals/*/visual.yaml")):
        vis = Visual(**_yaml(vis_file))
        if vis.status == "built" and not (vis_file.parent / vis.entry).exists():
            raise ContentError(f"{vis_file}: entry {vis.entry} introuvable")
        idx.visuals[vis.id] = vis

    quiz_id = None
    if (dir_ / "quiz.yaml").exists():
        quiz = Quiz(**_yaml(dir_ / "quiz.yaml"), lesson_id=lesson_id)
        idx.quizzes[quiz.id] = quiz
        quiz_id = quiz.id
    cards = []
    if (dir_ / "flashcards.yaml").exists():
        cards = [Flashcard(**c) for c in _yaml(dir_ / "flashcards.yaml").get("cards", [])]

    return Lesson(
        **meta, body=m.group(2), slug=dir_.name, chapter_id=chapter_id, quiz_id=quiz_id, flashcards=cards
    )


def _chapter(dir_: Path, course_id: str, idx: ContentIndex) -> Chapter:
    meta = _yaml(dir_ / "chapter.yaml")
    chapter_id = meta["id"]
    lesson_ids = []
    for slug in meta["lessons"]:
        lesson_dir = dir_ / slug
        if not lesson_dir.is_dir():
            raise ContentError(f"{dir_}: leçon {slug} déclarée mais absente")
        lesson = _lesson(lesson_dir, chapter_id, idx)
        idx.lessons[lesson.id] = lesson
        lesson_ids.append(lesson.id)

    special = {}
    for role, meta_file in (
        ("assignment", "assignment.yaml"),
        ("boss", "lab.yaml"),
        ("project", "project.yaml"),
    ):
        sub = dir_ / role
        if (sub / meta_file).exists():
            ex = _exercise(sub, meta_file, role, chapter_id, None)
            idx.exercises[ex.id] = ex
            special[f"{role}_id"] = ex.id

    return Chapter(**meta, slug=dir_.name, course_id=course_id, lesson_ids=lesson_ids, **special)


def _check_references(idx: ContentIndex) -> None:
    concept_ids = {c.id for lesson in idx.lessons.values() for c in lesson.concepts}
    for lesson in idx.lessons.values():
        for lab_id in lesson.labs:
            if lab_id not in idx.exercises:
                raise ContentError(f"{lesson.id}: TP {lab_id} introuvable")
        for vis_id in set(lesson.visuals) | set(VISUAL_DIRECTIVE.findall(lesson.body)):
            if vis_id not in idx.visuals:
                raise ContentError(f"{lesson.id}: visuel {vis_id} introuvable")
    for quiz in idx.quizzes.values():
        for q in quiz.questions:
            if q.concept not in concept_ids:
                raise ContentError(f"{quiz.id}/{q.id}: concept {q.concept} inconnu")
    for ex in idx.exercises.values():
        for c in ex.concepts:
            if c not in concept_ids:
                raise ContentError(f"{ex.id}: concept {c} inconnu")


def load_content(root: Path) -> ContentIndex:
    idx = ContentIndex()
    for course_file in sorted(root.glob("*/course.yaml")):
        course_dir = course_file.parent
        meta = _yaml(course_file)
        chapter_ids = []
        for track in meta["tracks"]:
            for slug in track["chapters"]:
                if not (course_dir / slug / "chapter.yaml").exists():
                    continue  # chapitre planifié mais pas encore généré
                chapter = _chapter(course_dir / slug, meta["id"], idx)
                idx.chapters[chapter.id] = chapter
                chapter_ids.append(chapter.id)
        course = Course(**meta, slug=course_dir.name, chapter_ids=chapter_ids)
        idx.courses[course.id] = course
        for lab_file in sorted((course_dir / "sandbox").glob("*/lab.yaml")):
            ex = _exercise(lab_file.parent, "lab.yaml", "lab", "", None)
            idx.exercises[ex.id] = ex.model_copy(update={"course_id": course.id})
            idx.sandbox.append(ex.id)
    _check_references(idx)
    _check_course_requirements(idx)
    return idx


def _check_course_requirements(idx: ContentIndex) -> None:
    for course in idx.courses.values():
        for req in course.requires:
            other = idx.courses.get(req.course)
            if other is None:
                raise ContentError(f"{course.id}: cours pré-requis {req.course} inconnu")
            if not any(req.through in t.chapters for t in other.tracks):
                raise ContentError(f"{course.id}: module {req.through} absent de {req.course}")
