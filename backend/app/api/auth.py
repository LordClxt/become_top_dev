import hmac

from fastapi import APIRouter, HTTPException, Request

from app.core.config import settings
from app.schemas.api import LoginIn

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginIn, request: Request) -> dict[str, bool]:
    if not hmac.compare_digest(body.password.encode(), settings.app_password.encode()):
        raise HTTPException(status_code=401, detail="mot de passe incorrect")
    request.session["auth"] = True
    return {"authenticated": True}


@router.post("/logout")
def logout(request: Request) -> dict[str, bool]:
    request.session.clear()
    return {"authenticated": False}


@router.get("/me")
def me(request: Request) -> dict[str, bool]:
    return {"authenticated": bool(request.session.get("auth"))}
