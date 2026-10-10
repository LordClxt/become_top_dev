from datetime import date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_progress_service
from app.services.progress import ProgressService

router = APIRouter(tags=["progress"])


def user_tz(tz: str = Query("UTC", max_length=64)) -> str:
    """Fuseau IANA envoyé par le navigateur : il décide à quel jour appartient une action."""
    try:
        ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError) as e:
        raise HTTPException(status_code=400, detail="fuseau horaire inconnu") from e
    return tz


def today_in(tz: str) -> date:
    return datetime.now(ZoneInfo(tz)).date()


@router.get("/progress")
async def progress(tz: str = Depends(user_tz), svc: ProgressService = Depends(get_progress_service)) -> dict:
    return await svc.summary(today_in(tz), tz)


@router.get("/activity")
async def activity(
    weeks: int = Query(26, ge=1, le=53),
    tz: str = Depends(user_tz),
    svc: ProgressService = Depends(get_progress_service),
) -> list[dict]:
    return await svc.activity(today_in(tz), weeks, tz)


@router.get("/activity/feed")
async def activity_feed(
    day: date | None = None,
    limit: int = Query(50, ge=1, le=200),
    tz: str = Depends(user_tz),
    svc: ProgressService = Depends(get_progress_service),
) -> list[dict]:
    return await svc.feed(today_in(tz), tz, day, limit)
