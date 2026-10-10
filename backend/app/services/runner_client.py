import httpx

from app.core.config import settings


class RunnerError(Exception):
    pass


class RunnerClient:
    """Client HTTP du service runner (seul composant autorisé à parler à Docker)."""

    async def run(self, language: str, files: dict[str, str], command: str, timeout_s: int) -> dict:
        try:
            async with httpx.AsyncClient(base_url=settings.runner_url, timeout=timeout_s + 30) as client:
                resp = await client.post(
                    "/run",
                    json={"language": language, "files": files, "command": command, "timeout_s": timeout_s},
                    headers={"Authorization": f"Bearer {settings.runner_token}"},
                )
        except httpx.HTTPError as e:
            raise RunnerError(f"runner injoignable : {e}") from e
        if resp.status_code != 200:
            raise RunnerError(f"runner : HTTP {resp.status_code} {resp.text[:200]}")
        return resp.json()
