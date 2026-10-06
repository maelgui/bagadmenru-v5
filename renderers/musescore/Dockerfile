ARG UBUNTU_VERSION=24.04
FROM ubuntu:${UBUNTU_VERSION}

ARG MSCORE_VERSION=4.7.5
ARG MSCORE_BUILD=4.7.5.260831071

ENV DEBIAN_FRONTEND=noninteractive
ENV MSCORE_BIN=/opt/musescore/squashfs-root/AppRun
ENV VIRTUAL_ENV=/opt/venv
ENV PATH=/opt/venv/bin:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        wget \
        xvfb \
        python3 \
        python3-venv \
        libfuse2t64 \
        libglib2.0-0 \
        libegl1 \
        libgl1 \
        libglx-mesa0 \
        libopengl0 \
        libnss3 \
        libasound2t64 \
        libpulse0 \
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

RUN python3 -m venv "$VIRTUAL_ENV"
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

WORKDIR /app
COPY server.py /app/server.py

ENV QT_QPA_PLATFORM=offscreen

EXPOSE 8080
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
