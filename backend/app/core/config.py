from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="BTD_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://btd:btd@localhost:5433/btd"
    content_dir: Path = REPO_ROOT / "content"
    session_secret: str = "dev-session-secret-change-me"
    app_password: str = "dev"
    secure_cookies: bool = False
    runner_url: str = "http://localhost:8001"
    runner_token: str = "dev-runner-token"


settings = Settings()
