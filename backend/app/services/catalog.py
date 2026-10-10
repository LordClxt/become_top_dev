"""Vue « catalogue » des cours : métadonnées, parcours et modules prévus, avec ou sans progression."""

from app.content.loader import ContentIndex
from app.content.models import Course
from app.services.progress import ChapterMastery


def ordered_courses(content: ContentIndex) -> list[Course]:
    return sorted(content.courses.values(), key=lambda c: c.order)


def course_overview(content: ContentIndex, course: Course, mastery: dict[str, ChapterMastery] | None) -> dict:
    """`mastery` absent : vue publique (landing), sans aucun état utilisateur."""
    by_slug = {c.slug: c for c in content.chapters.values() if c.course_id == course.id}
    tracks = []
    for track in course.tracks:
        chapters = []
        for slug in track.chapters:
            ch = by_slug.get(slug)
            if ch is None:
                chapters.append(
                    {"slug": slug, "available": False, "title": course.planned_titles.get(slug, slug)}
                )
                continue
            item = {
                "slug": slug,
                "available": True,
                "id": ch.id,
                "title": ch.title,
                "subtitle": ch.subtitle,
                "lesson_count": len(ch.lesson_ids),
            }
            if mastery is not None:
                item["mastery"] = mastery[ch.id].__dict__
            chapters.append(item)
        tracks.append(
            {"id": track.id, "title": track.title, "optional": track.optional, "chapters": chapters}
        )

    return {
        "id": course.id,
        "slug": course.slug,
        "title": course.title,
        "kind": course.kind,
        "summary": course.summary,
        "book": course.book.model_dump(),
        "running_project": course.running_project.model_dump() if course.running_project else None,
        "requires": [_requirement(content, req, mastery) for req in course.requires],
        "tracks": tracks,
    }


def _requirement(content: ContentIndex, req, mastery: dict[str, ChapterMastery] | None) -> dict:
    other = content.courses[req.course]
    # Pré-requis rempli quand chaque module jusqu'à `through` existe et est maîtrisé.
    slugs = [s for t in other.tracks for s in t.chapters]
    needed = slugs[: slugs.index(req.through) + 1]
    by_slug = {c.slug: c for c in content.chapters.values() if c.course_id == other.id}
    met = mastery is not None and all(s in by_slug and mastery[by_slug[s].id].mastered for s in needed)
    return {
        "course_id": other.id,
        "course_title": other.title,
        "through_title": other.planned_titles.get(req.through, req.through),
        "reason": req.reason,
        "met": met,
    }
