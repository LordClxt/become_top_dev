FROM golang:1.27.1 AS build
WORKDIR /src
COPY go.mod ./
COPY *.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /runner .

# Image root : le runner doit pouvoir ouvrir le socket Docker de l'hôte.
FROM gcr.io/distroless/static-debian12
COPY --from=build /runner /runner

# Ce service a accès au socket Docker de l'hôte : il ne doit jamais être exposé publiquement.
EXPOSE 8001
ENTRYPOINT ["/runner"]
