import os
import subprocess
import sys

import typer

from src.python.generate_static import generate_static
from src.python.sync import sync

app = typer.Typer()


@app.command(name="sync")
def sync_cmd():
    """Sync the structured CV content to the HDF5 lock file."""
    print("Syncing data into cv_data.h5...")
    sync()


@app.command(name="build-static")
def generate_static_cmd():
    """Generate the static PDF CV into the build/ directory."""
    print("Generating static CV...")
    generate_static()


@app.command(name="build-frontend")
def build_frontend():
    """Build the static HTML frontend."""
    import shutil

    print("Building static frontend...")
    os.makedirs("build", exist_ok=True)
    shutil.copy2("src/web/index.html", "build/index.html")
    print("Successfully built build/index.html")


@app.command(name="build-api")
def build_api():
    """Build the Rust API server executable."""
    print("Building Rust API server...")
    subprocess.run(["cargo", "build", "--release"], cwd="src/rust", check=False)


@app.command(name="serve-api")
def serve_api():
    """Run the Rust API server."""
    print("Running Rust API server...")
    api_exe = "src/rust/target/release/cv-api"
    if not os.path.exists(api_exe):
        print(
            f"API executable not found at {api_exe}. Please run 'cv build-api' first."
        )
        sys.exit(1)
    subprocess.run([api_exe], check=False)


@app.command(name="serve")
def serve():
    """Serve the static frontend and the API server together for testing."""
    import http.server
    import socketserver
    import threading

    # Ensure everything is built
    build_api()
    build_frontend()

    def run_frontend():
        print("Starting static frontend on http://127.0.0.1:8000")

        class QuietHandler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory="build", **kwargs)

            def log_message(self, format, *args):
                pass

        with socketserver.TCPServer(("", 8000), QuietHandler) as httpd:
            httpd.serve_forever()

    t = threading.Thread(target=run_frontend, daemon=True)
    t.start()

    # Run the API in the main thread so Ctrl+C kills everything
    serve_api()


def main():
    app()


if __name__ == "__main__":
    main()


@app.command(name="test-api")
def test_api():
    """Run the Rust API unit tests."""
    print("Running Rust API tests...")
    subprocess.run(["cargo", "test"], cwd="src/rust", check=True)
