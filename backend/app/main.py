from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.api import auth, catalog, content, exercises, profile, progress, quizzes
from app.api.deps import require_auth
from app.content.loader import load_content
from app.core.config import settings
from app.services.runner_client import RunnerClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.content = load_content(settings.content_dir)
    app.state.runner = RunnerClient()
    yield


app = FastAPI(title="become_top_dev", lifespan=lifespan)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    session_cookie="btd_session",
    max_age=60 * 60 * 24 * 30,
    same_site="lax",
    https_only=settings.secure_cookies,
)

app.include_router(auth.router, prefix="/api")
app.include_router(catalog.router, prefix="/api")
protected = [Depends(require_auth)]
for module in (content, exercises, quizzes, progress, profile):
    app.include_router(module.router, prefix="/api", dependencies=protected)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
