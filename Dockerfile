FROM rust:bookworm AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libhdf5-dev pkg-config && \
    rm -rf /var/lib/apt/lists/*

RUN wget -q https://github.com/typst/typst/releases/download/v0.11.1/typst-x86_64-unknown-linux-musl.tar.xz && \
    tar -xf typst-x86_64-unknown-linux-musl.tar.xz && \
    mv typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst && \
    rm -rf typst*

COPY . /app/

WORKDIR /app/src/rust
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libhdf5-103-1 fontconfig && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/bin/typst /usr/local/bin/typst
COPY --from=builder /app/src/rust/target/release/cv-api /app/cv-api

COPY cv_data.h5 /app/cv_data.h5
COPY src/typst /app/src/typst

RUN mkdir -p /app/build && chmod 777 /app/build

CMD ["/app/cv-api"]
