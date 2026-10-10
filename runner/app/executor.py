"""Lance un conteneur jetable, y copie les fichiers, exécute la commande et récupère la sortie."""

import io
import tarfile
import time
from dataclasses import dataclass

import docker
from docker.errors import NotFound
from requests.exceptions import ConnectionError as RequestsConnectionError
from requests.exceptions import ReadTimeout

from app.config import settings

WORKDIR = "/work"


@dataclass
class RunResult:
    exit_code: int
    output: str
    duration_ms: int
    timed_out: bool
    truncated: bool


def _tar(files: dict[str, str]) -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as tar:
        for path, content in files.items():
            data = content.encode()
            info = tarfile.TarInfo(name=path)
            info.size = len(data)
            info.mode = 0o644
            info.uid = info.gid = 65534
            tar.addfile(info, io.BytesIO(data))
    return buf.getvalue()


def run(image: str, files: dict[str, str], command: str, timeout_s: int) -> RunResult:
    client = docker.from_env()
    container = client.containers.create(
        image,
        command=["sh", "-c", command],
        working_dir=WORKDIR,
        network_disabled=True,
        mem_limit=settings.memory_limit,
        memswap_limit=settings.memory_limit,
        nano_cpus=int(settings.cpus * 1e9),
        pids_limit=settings.pids_limit,
        cap_drop=["ALL"],
        security_opt=["no-new-privileges"],
        user="65534:65534",
    )
    try:
        container.put_archive(WORKDIR, _tar(files))
        start = time.monotonic()
        container.start()
        timed_out = False
        try:
            exit_code = container.wait(timeout=timeout_s)["StatusCode"]
        except (ReadTimeout, RequestsConnectionError):
            timed_out = True
            container.kill()
            exit_code = -1
        duration_ms = int((time.monotonic() - start) * 1000)
        raw = container.logs(stdout=True, stderr=True)
        truncated = len(raw) > settings.max_output_bytes
        output = raw[: settings.max_output_bytes].decode(errors="replace")
        return RunResult(exit_code, output, duration_ms, timed_out, truncated)
    finally:
        try:
            container.remove(force=True)
        except NotFound:
            pass
