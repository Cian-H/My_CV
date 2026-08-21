FROM rust:alpine as builder
WORKDIR /app
RUN apk add --no-cache musl-dev hdf5-dev pkgconfig

COPY . /app/

WORKDIR /app/src/rust
RUN cargo build --release

FROM alpine:latest
WORKDIR /app
RUN apk add --no-cache hdf5

COPY --from=builder /app/src/rust/target/release/cv-api /app/cv-api

CMD ["/app/cv-api"]
