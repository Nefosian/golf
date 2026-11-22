FROM golang:1.27 AS build
# Chromium draws the pictures of the holes (tools/previews); Debian's draws WebGL without a graphics
# card (SwiftShader), Alpine's does not
RUN apt-get update && apt-get install -y --no-install-recommends chromium && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY . .
# Every hole is played by the verifier, and a hole it refuses stops the build; then every hole is
# drawn, so the pictures are always those of the maps built. The caches survive between builds:
# only what changed is compiled again.
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go run ./tools/verify && \
    CGO_ENABLED=0 go run ./tools/previews && \
    CGO_ENABLED=0 go build -trimpath -tags nethttpomithttp2 -ldflags="-s -w" -o /trou-normand .

# the binary carries everything: nothing else is needed
FROM scratch
COPY --from=build /trou-normand /trou-normand
USER 65534:65534
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --start-interval=1s CMD ["/trou-normand", "healthcheck"]
ENTRYPOINT ["/trou-normand"]
