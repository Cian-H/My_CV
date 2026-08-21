# CV API Server

This is the high-performance Rust backend for serving the CV data API. It reads
directly from the SSOT HDF5 lockfile (`cv_data.h5`) and serves the data as JSON
to the frontend.

## Building

The API must be built within the `devenv` shell to ensure it links correctly
against the required HDF5 C headers:

```bash
# Using the python CLI wrapper (from project root):
uv run cv build-api

# OR manually via cargo:
devenv shell cargo build --release
```

## Running & Configuration

You can run the server directly or via the python CLI orchestrator
(`uv run cv serve`).

The server is highly configurable to make deployment on your microserver easy.
It supports both command-line arguments and environment variables.

### Options

| Option              | Environment Variable | Default      | Description                                                  |
| :------------------ | :------------------- | :----------- | :----------------------------------------------------------- |
| `-p, --port <PORT>` | `CV_PORT`            | `3000`       | Port to listen on                                            |
| `-b, --bind <BIND>` | `CV_BIND`            | `127.0.0.1`  | IP address to bind to (`0.0.0.0` to expose on local network) |
| `-f, --file <FILE>` | `CV_HDF5_PATH`       | `cv_data.h5` | Path to the HDF5 CV data lockfile                            |
| `-h, --help`        |                      |              | Print help                                                   |
| `-V, --version`     |                      |              | Print version                                                |

### Examples

**Local Testing:**

```bash
./target/release/cv-api
# Listens on 127.0.0.1:3000 and reads cv_data.h5 from the current directory
```

**Deployed to Microserver:**

```bash
# Expose to local network on port 8080 using environment variables
export CV_BIND="0.0.0.0"
export CV_PORT="8080"
export CV_HDF5_PATH="/var/data/cv_data.h5"

./target/release/cv-api
```

**Deployed using CLI Flags:**

```bash
./target/release/cv-api --bind 0.0.0.0 --port 8080 --file /var/data/cv_data.h5
```
