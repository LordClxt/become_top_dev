# Image d'exécution des exercices Go : une instance jetable par exécution.
FROM golang:1.27.2

ENV GOTOOLCHAIN=local \
    GOFLAGS=-mod=mod \
    GOCACHE=/gocache \
    HOME=/tmp \
    CGO_ENABLED=1

# Pré-compile la bibliothèque standard (et le runtime du détecteur de races)
# pour que le premier `go test` d'un exercice soit rapide.
RUN mkdir -p /work /gocache \
 && go build std \
 && go build -race std \
 && chown -R 65534:65534 /work /gocache

USER 65534:65534
WORKDIR /work
