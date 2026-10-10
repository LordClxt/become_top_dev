from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="RUNNER_")

    token: str = "dev-runner-token"
    images: dict[str, str] = {"go": "btd-runner-go"}
    max_concurrent_runs: int = 4
    memory_limit: str = "512m"
    cpus: float = 1.0
    pids_limit: int = 256
    max_timeout_s: int = 120
    max_output_bytes: int = 1_000_000


settings = Settings()
