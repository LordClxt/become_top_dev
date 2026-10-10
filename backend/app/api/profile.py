from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.api.deps import get_profile_service
from app.services.profile import MAX_AVATAR_BYTES, ProfileService

router = APIRouter(tags=["profile"])


@router.get("/profile")
async def profile(svc: ProfileService = Depends(get_profile_service)) -> dict:
    return await svc.summary()


@router.get("/profile/avatar")
async def get_avatar(svc: ProfileService = Depends(get_profile_service)) -> Response:
    data, content_type = await svc.avatar()
    # L'URL porte `?v=<version>` : on peut donc la cacher longtemps, elle change à chaque envoi.
    return Response(
        data,
        media_type=content_type,
        headers={"Cache-Control": "private, max-age=31536000", "X-Content-Type-Options": "nosniff"},
    )


@router.put("/profile/avatar", status_code=204)
async def put_avatar(request: Request, svc: ProfileService = Depends(get_profile_service)) -> None:
    """Corps brut de l'image (pas de multipart : une dépendance de moins)."""
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="image trop lourde (2 Mo maximum)")
    body = bytearray()
    async for chunk in request.stream():
        body += chunk
        if len(body) > MAX_AVATAR_BYTES:
            raise HTTPException(status_code=413, detail="image trop lourde (2 Mo maximum)")
    await svc.set_avatar(bytes(body))


@router.delete("/profile/avatar", status_code=204)
async def delete_avatar(svc: ProfileService = Depends(get_profile_service)) -> None:
    await svc.remove_avatar()
