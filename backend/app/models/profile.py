from datetime import datetime

from sqlalchemy import DateTime, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Profile(Base):
    """Réglages de l'utilisateur unique : une seule ligne (id = 1). L'avatar est petit, on le garde en base."""

    __tablename__ = "profile"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    avatar: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    avatar_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    avatar_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
