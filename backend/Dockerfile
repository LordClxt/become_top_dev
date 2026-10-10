# Contexte de build : racine du dépôt (le contenu des cours est embarqué dans l'image).
FROM golang:1.27.1 AS build
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/cmd ./cmd
COPY backend/internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /btd ./cmd/btd

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /btd /btd
COPY content/ /app/content/
ENV BTD_CONTENT_DIR=/app/content BTD_ADDR=:8000

EXPOSE 8000
# `serve` applique les migrations avant d'écouter.
ENTRYPOINT ["/btd", "serve"]
