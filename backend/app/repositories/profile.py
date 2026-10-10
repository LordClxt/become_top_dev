from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile import Profile

PROFILE_ID = 1


class ProfileRepository:
    def __init__(self, session: AsyncSession):
        self.s = session

    async def get(self) -> Profile | None:
        return await self.s.get(Profile, PROFILE_ID)

    async def set_avatar(self, data: bytes | None, content_type: str | None) -> None:
        values = {
            "avatar": data,
            "avatar_type": content_type,
            "avatar_updated_at": func.now() if data else None,
        }
        stmt = (
            insert(Profile)
            .values(id=PROFILE_ID, **values)
            .on_conflict_do_update(index_elements=["id"], set_=values)
        )
        await self.s.execute(stmt)
        await self.s.commit()
