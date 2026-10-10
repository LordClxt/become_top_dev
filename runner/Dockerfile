FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:0.12.1 /uv /bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY app/ ./app/
ENV PATH="/app/.venv/bin:$PATH"

# Ce service a accès au socket Docker de l'hôte : il ne doit jamais être exposé publiquement.
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
