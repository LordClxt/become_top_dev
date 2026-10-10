"""Modèles du contenu de cours, tel qu'il est stocké dans content/ (voir le skill content-format)."""

from datetime import date
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Strict(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)


class Source(Strict):
    chapter: int
    pages: str


class Concept(Strict):
    id: str
    label: str


class GlossaryEntry(Strict):
    term: str
    definition: str


class Verified(Strict):
    at: date
    solution: Literal["pass"]
    starter: Literal["fail"]


ExerciseRole = Literal["lab", "assignment", "boss", "project"]


class PaletteItem(Strict):
    """Un bloc que l'on peut poser sur un diagramme. `shape` choisit l'icône et la forme."""

    type: str
    label: str
    shape: Literal["client", "service", "queue", "database", "external", "cache"]
    hint: str = ""


class DiagramCheck(Strict):
    """Règle vérifiée sur le graphe d'un exercice `diagram` (voir services/diagram.py).

    - path : un chemin de `source` à `target` existe (et passe toujours par `via`, si précisé)
    - no_edge : aucune flèche directe de `source` vers `target`
    - inbound_via : tout ce qui entre dans `target` vient d'un bloc de type `via`
    - single_owner : chaque bloc de type `target` a au plus un bloc entrant
    - connected : aucun bloc isolé
    """

    id: str
    label: str
    rule: Literal["path", "no_edge", "inbound_via", "single_owner", "connected"]
    source: str | None = None
    target: str | None = None
    via: str | None = None


class Exercise(Strict):
    """Un exercice exécutable : TP, devoir, boss fight ou étape de projet."""

    id: str
    title: str
    kind: Literal["code", "tests", "design", "diagram"]
    language: str = ""
    xp: int
    test_command: str = ""
    files_editable: list[str]
    concepts: list[str] = []
    difficulty: int = 1
    timeout_s: int = 30
    checks: list[Literal["race", "goroutine-leak"]] = []
    verified: Verified

    role: ExerciseRole = "lab"
    chapter_id: str = ""
    lesson_id: str | None = None
    path: Path = Field(exclude=True)
    instructions: str = ""
    hints: list[str] = []
    rubric: list[dict[str, Any]] = []
    milestones: list[dict[str, Any]] = []
    source: Source | None = None
    # kind=diagram : blocs disponibles et règles (tests/checks.yaml)
    palette: list[PaletteItem] = []
    diagram_checks: list[DiagramCheck] = []
    course_id: str = ""


class QuizQuestion(Strict):
    id: str
    type: Literal["single", "multiple", "code-output", "order", "free"]
    prompt: str
    code: str | None = None
    choices: list[str] = []
    answer: Any
    explanation: str
    concept: str
    difficulty: int = 1


class Quiz(Strict):
    id: str
    questions: list[QuizQuestion]
    lesson_id: str = ""


class Flashcard(Strict):
    id: str
    front: str
    back: str
    concept: str


class Visual(Strict):
    id: str
    concept: str
    format: Literal["remotion", "interactive", "static", "hyperframes"]
    justification: str
    entry: str
    status: Literal["idea", "built"] = "idea"
    params: list[dict[str, Any]] = []


class Lesson(Strict):
    id: str
    title: str
    source: Source
    duration_min: int = 15
    concepts: list[Concept]
    glossary: list[GlossaryEntry] = []
    visuals: list[str] = []
    labs: list[str] = []
    extra: bool = False
    xp: int
    body: str = ""
    slug: str = ""
    chapter_id: str = ""
    quiz_id: str | None = None
    flashcards: list[Flashcard] = []


class Chapter(Strict):
    id: str
    title: str
    subtitle: str = ""
    source: Source
    objectives: list[str]
    mastery_threshold: float
    prerequisites: list[str] = []
    lessons: list[str]
    xp: dict[str, int] = {}
    slug: str = ""
    course_id: str = ""
    lesson_ids: list[str] = []
    assignment_id: str | None = None
    boss_id: str | None = None
    project_id: str | None = None


class Track(Strict):
    id: str
    title: str
    chapters: list[str]
    optional: bool = False


class Book(Strict):
    title: str
    authors: list[str]
    slug: str


class RunningProject(Strict):
    id: str
    title: str
    pitch: str


class CourseRequirement(Strict):
    """Cours conseillé avant celui-ci, jusqu'au module `through` inclus (pré-requis souple)."""

    course: str
    through: str
    reason: str


class Course(Strict):
    id: str
    title: str
    kind: Literal["practical", "conceptual"]
    book: Book
    summary: str
    order: int = 100  # position dans le catalogue
    language: str | None = None
    running_project: RunningProject | None = None
    requires: list[CourseRequirement] = []
    tracks: list[Track]
    planned_titles: dict[str, str] = {}
    slug: str = ""
    chapter_ids: list[str] = []
