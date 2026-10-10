from fastapi import HTTPException

from app.repositories.profile import ProfileRepository

MAX_AVATAR_BYTES = 2 * 1024 * 1024

# Le type est déduit des premiers octets, jamais de l'en-tête envoyé par le client.
_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
)


def sniff_image_type(data: bytes) -> str | None:
    for magic, content_type in _SIGNATURES:
        if data.startswith(magic):
            return content_type
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


class ProfileService:
    def __init__(self, repo: ProfileRepository):
        self.repo = repo

    async def summary(self) -> dict:
        profile = await self.repo.get()
        if profile is None or profile.avatar is None or profile.avatar_updated_at is None:
            return {"avatar_version": None}
        return {"avatar_version": int(profile.avatar_updated_at.timestamp() * 1000)}

    async def avatar(self) -> tuple[bytes, str]:
        profile = await self.repo.get()
        if profile is None or profile.avatar is None or profile.avatar_type is None:
            raise HTTPException(status_code=404, detail="pas d'avatar")
        return profile.avatar, profile.avatar_type

    async def set_avatar(self, data: bytes) -> None:
        if not data:
            raise HTTPException(status_code=400, detail="fichier vide")
        if len(data) > MAX_AVATAR_BYTES:
            raise HTTPException(status_code=413, detail="image trop lourde (2 Mo maximum)")
        content_type = sniff_image_type(data)
        if content_type is None:
            raise HTTPException(status_code=415, detail="format non pris en charge (PNG, JPEG ou WebP)")
        await self.repo.set_avatar(data, content_type)

    async def remove_avatar(self) -> None:
        await self.repo.set_avatar(None, None)
