FROM rust:bullseye AS build

# View app name in Cargo.toml
ARG APP_NAME=email-api

WORKDIR /app

COPY Cargo.lock Cargo.toml ./
RUN mkdir src \
    && echo "// dummy file" > src/lib.rs \
    && cargo build --release

COPY src src
RUN cargo build --locked --release
RUN cp ./target/release/$APP_NAME /bin/server

# FROM debian:bullseye-slim AS final
# COPY --from=build /bin/server /bin

CMD ["/bin/server"]
