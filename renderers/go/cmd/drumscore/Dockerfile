ARG UBUNTU_VERSION=24.04
ARG GO_VERSION=1.23

# ---- build stage: compile a static Go binary (stdlib only, no go.sum) ----
FROM golang:${GO_VERSION} AS build
WORKDIR /src
COPY go/go.mod ./
COPY go/renderer ./renderer
COPY go/cmd/drumscore ./cmd/drumscore
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/drumscore-renderer ./cmd/drumscore

# ---- runtime stage: same harness as the Python image ----
FROM ubuntu:${UBUNTU_VERSION}

ENV DEBIAN_FRONTEND=noninteractive
ENV DSE_BIN=/opt/drumscoreeditor/bin/DrumScoreEditor

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        wget \
        dpkg \
        xvfb \
        libfreetype6 \
        fontconfig \
        fonts-dejavu \
        fonts-liberation \
        libxext6 \
        libxrender1 \
        libxtst6 \
        libxi6 \
    && rm -rf /var/lib/apt/lists/*

# Drum Score Editor ships a Linux .deb (jpackage bundle carrying its own Java
# runtime). The upstream download server (o2switch) resets connections from
# GitHub Actions runner IPs, so the frozen v3.6.6 package is mirrored as a
# GitHub release asset. We extract the package data only (dpkg-deb -x): the
# .deb postinst runs xdg-desktop-menu which fails in a headless image, so a
# normal apt/dpkg install exits non-zero even though the binary installs fine.
# Extraction skips the maintainer scripts entirely.
ARG DSE_DEB_URL=https://github.com/maelgui/bagadmenru-v5/releases/download/dse-3.6.6/dse-3.6.6.deb
ARG DSE_DEB_SHA256=8ebe7a2f022aada42a4636d4606902a31f7d49872b11a83fb9c43d3827965a32
RUN wget \
        --tries=5 \
        --timeout=60 \
        --waitretry=15 \
        --retry-connrefused \
        --continue \
        -O /tmp/dse.deb \
        "${DSE_DEB_URL}" \
    && echo "${DSE_DEB_SHA256}  /tmp/dse.deb" | sha256sum -c - \
    && dpkg-deb -x /tmp/dse.deb / \
    && rm /tmp/dse.deb \
    && test -x "${DSE_BIN}"

# Make fc-match resolve the generic serif/sans aliases to the Times-metric
# Liberation family instead of DejaVu, so DSE's logical fonts render with the
# intended letterforms (see fonts-local.conf). This must land at
# /etc/fonts/local.conf (fontconfig's final-override slot); a file under
# conf.d/ is outranked by the distro's 60-latin.conf serif binding.
COPY go/cmd/drumscore/fonts-local.conf /etc/fonts/local.conf
RUN fc-cache -f

WORKDIR /app
COPY --from=build /out/drumscore-renderer /app/drumscore-renderer
COPY go/cmd/drumscore/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/app/entrypoint.sh"]
