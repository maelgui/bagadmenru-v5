ARG UBUNTU_VERSION=24.04
FROM ubuntu:${UBUNTU_VERSION}

ENV DEBIAN_FRONTEND=noninteractive
ENV DSE_BIN=/opt/drumscoreeditor/bin/DrumScoreEditor
ENV VIRTUAL_ENV=/opt/venv
ENV PATH=/opt/venv/bin:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        wget \
        dpkg \
        xvfb \
        python3 \
        python3-venv \
        libfreetype6 \
        fontconfig \
        fonts-dejavu \
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

RUN python3 -m venv "$VIRTUAL_ENV"
COPY drumscore/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

WORKDIR /app
COPY contract.py /app/contract.py
COPY drumscore/server.py /app/server.py
COPY drumscore/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/app/entrypoint.sh"]
