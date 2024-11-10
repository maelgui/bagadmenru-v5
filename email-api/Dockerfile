FROM rust:bullseye AS build

# View app name in Cargo.toml
ARG APP_NAME=email-api

WORKDIR /app

COPY Cargo.lock Cargo.toml ./
RUN mkdir src \
    && echo "// dummy file" > src/lib.rs
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build

COPY src src
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --locked \
    && cp ./target/debug/$APP_NAME /bin/server

FROM debian:bullseye-slim AS final
COPY --from=build /bin/server /bin
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
CMD ["/bin/server"]
