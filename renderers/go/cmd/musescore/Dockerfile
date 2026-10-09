ARG UBUNTU_VERSION=24.04
ARG GO_VERSION=1.23

# ---- build stage: compile a static Go binary (stdlib only, no go.sum) ----
FROM golang:${GO_VERSION} AS build
WORKDIR /src
COPY go/go.mod ./
COPY go/renderer ./renderer
COPY go/cmd/musescore ./cmd/musescore
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/musescore-renderer ./cmd/musescore

# ---- runtime stage: same harness as the Python image ----
FROM ubuntu:${UBUNTU_VERSION}

ARG MSCORE_VERSION=4.7.5
ARG MSCORE_BUILD=4.7.5.260831071

ENV DEBIAN_FRONTEND=noninteractive
ENV MSCORE_BIN=/opt/musescore/squashfs-root/AppRun

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        wget \
        xvfb \
        libfuse2t64 \
        libglib2.0-0 \
        libegl1 \
        libgl1 \
        libglx-mesa0 \
        libopengl0 \
        libnss3 \
        libasound2t64 \
        libpulse0 \
        libjack-jackd2-0 \
        libpipewire-0.3-0t64 \
        libxcb-cursor0 \
        libxkbcommon0 \
        libxcb-icccm4 \
        libxcb-image0 \
        libxcb-keysyms1 \
        libxcb-randr0 \
        libxcb-render-util0 \
        libxcb-shape0 \
        libxcb-xinerama0 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        libxtst6 \
        libxi6 \
        libgl1-mesa-dri \
        fonts-dejavu \
        fontconfig \
    && rm -rf /var/lib/apt/lists/*

# MuseScore ships no apt package for 4.x; the official AppImage is the only
# self-contained distribution carrying the exact build we pin.
RUN mkdir -p /opt/musescore \
    && wget -q -O /opt/musescore/MuseScore.AppImage \
        "https://github.com/musescore/MuseScore/releases/download/v${MSCORE_VERSION}/MuseScore-Studio-${MSCORE_BUILD}-x86_64.AppImage" \
    && chmod +x /opt/musescore/MuseScore.AppImage \
    && cd /opt/musescore \
    && ./MuseScore.AppImage --appimage-extract >/dev/null \
    && rm /opt/musescore/MuseScore.AppImage

WORKDIR /app
COPY --from=build /out/musescore-renderer /app/musescore-renderer

ENV QT_QPA_PLATFORM=offscreen

EXPOSE 8080
ENTRYPOINT ["/app/musescore-renderer"]
