"""Catalogue public des cours, pour la page d'accueil : aucune donnée utilisateur."""

from fastapi import APIRouter, Depends

from app.api.deps import get_content
from app.content.loader import ContentIndex
from app.services.catalog import course_overview, ordered_courses

router = APIRouter(tags=["catalog"])


@router.get("/catalog")
def catalog(content: ContentIndex = Depends(get_content)) -> list[dict]:
    return [course_overview(content, course, None) for course in ordered_courses(content)]
