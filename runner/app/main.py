import asyncio
import hmac
from pathlib import PurePosixPath

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, field_validator

from app import executor
from app.config import settings

app = FastAPI(title="btd-runner")
_slots = asyncio.Semaphore(settings.max_concurrent_runs)


def require_token(authorization: str = Header(default="")) -> None:
    expected = f"Bearer {settings.token}"
    if not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="invalid runner token")


class RunRequest(BaseModel):
    language: str
    files: dict[str, str] = Field(max_length=200)
    command: str = Field(max_length=500)
    timeout_s: int = Field(ge=1)

    @field_validator("files")
    @classmethod
    def safe_paths(cls, files: dict[str, str]) -> dict[str, str]:
        for path in files:
            p = PurePosixPath(path)
            if p.is_absolute() or ".." in p.parts or not p.parts:
                raise ValueError(f"chemin de fichier interdit : {path!r}")
        return files


class RunResponse(BaseModel):
    exit_code: int
    output: str
    duration_ms: int
    timed_out: bool
    truncated: bool


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/run", dependencies=[Depends(require_token)])
async def run(req: RunRequest) -> RunResponse:
    image = settings.images.get(req.language)
    if image is None:
        raise HTTPException(status_code=400, detail=f"langage non supporté : {req.language}")
    timeout = min(req.timeout_s, settings.max_timeout_s)
    async with _slots:
        result = await run_in_threadpool(executor.run, image, req.files, req.command, timeout)
    return RunResponse(**result.__dict__)
