FROM rust:alpine as builder
WORKDIR /app
RUN apk add --no-cache musl-dev hdf5-dev pkgconfig

ENV HDF5_DIR=/usr

COPY . /app/

WORKDIR /app/src/rust
RUN cargo build --release

FROM alpine:latest
WORKDIR /app
RUN apk add --no-cache hdf5 curl wget fontconfig

# Install Typst
RUN wget https://github.com/typst/typst/releases/download/v0.11.1/typst-x86_64-unknown-linux-musl.tar.xz && \
    tar -xf typst-x86_64-unknown-linux-musl.tar.xz && \
    mv typst-x86_64-unknown-linux-musl/typst /usr/local/bin/ && \
    rm -rf typst*

# Copy the Rust API binary
COPY --from=builder /app/src/rust/target/release/cv-api /app/cv-api

# Copy necessary assets
COPY cv_data.h5 /app/cv_data.h5
COPY src/typst /app/src/typst

# Create the build directory for temp files
RUN mkdir -p /app/build && chmod 777 /app/build

CMD ["/app/cv-api"]
