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
# runtime). The download server rejects hotlinking unless a browser User-Agent
# and the product page Referer are sent. We extract the package data only
# (dpkg-deb -x): the .deb postinst runs xdg-desktop-menu which fails in a
# headless image, so a normal apt/dpkg install exits non-zero even though the
# binary installs fine. Extraction skips the maintainer scripts entirely.
RUN wget -q \
        --header="User-Agent: Mozilla/5.0 (X11; Linux x86_64)" \
        --header="Referer: https://www.drummingondemand.com/drum-score-editor/" \
        -O /tmp/dse.deb \
        "https://www.drummingondemand.com/_dsedl.php?os=tux" \
    && dpkg-deb -x /tmp/dse.deb / \
    && rm /tmp/dse.deb \
    && test -x "${DSE_BIN}"

RUN python3 -m venv "$VIRTUAL_ENV"
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

WORKDIR /app
COPY server.py /app/server.py
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/app/entrypoint.sh"]
