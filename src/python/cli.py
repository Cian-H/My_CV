import os
import subprocess
import sys

import typer

from src.python.generate_static import generate_static
from src.python.sync import sync

app = typer.Typer()


@app.command(name="sync")
def sync_cmd(
    profile: str = typer.Option(
        "general", help="Profile to use (e.g. academic, industry)"
    ),
):
    """Sync the structured CV content to the HDF5 lock file."""
    print(f"Syncing data into cv_data.h5 using profile: {profile}...")
    sync(profile)


@app.command(name="build-static")
def generate_static_cmd(
    exclude: str = "",
    profile: str = typer.Option(
        "general", help="Profile to use (e.g. academic, industry)"
    ),
):
    """Generate the static PDF CV into the build/ directory. Use --exclude to comma-separate sections to exclude."""
    print(f"Generating static CV with profile {profile}...")
    excludes = [e.strip() for e in exclude.split(",")] if exclude else None
    generate_static(excludes, profile)


@app.command(name="build-frontend")
def build_frontend():
    """Build the static HTML frontend."""
    import shutil

    print("Building static frontend...")
    os.makedirs("build", exist_ok=True)
    shutil.copy2("src/web/index.html", "build/index.html")
    shutil.copy2("src/web/style.css", "build/style.css")
    shutil.copy2("src/web/favicon.jpg", "build/favicon.jpg")
    subprocess.run(
        [
            "deno",
            "run",
            "-A",
            "npm:esbuild",
            "src/web/main.ts",
            "--bundle",
            "--outfile=build/bundle.js",
            "--minify",
        ],
        check=True,
    )
    print("Successfully built build/")


@app.command(name="build-api")
def build_api():
    """Build the Rust API server executable."""
    print("Building Rust API server...")
    subprocess.run(
        ["devenv", "shell", "cargo", "build", "--release"], cwd="src/rust", check=False
    )


@app.command(
    name="serve-api",
    context_settings={"allow_extra_args": True, "ignore_unknown_options": True},
)
def serve_api(ctx: typer.Context):
    """Run the Rust API server."""
    print("Running Rust API server...")
    api_exe = "src/rust/target/release/cv-api"
    if not os.path.exists(api_exe):
        print(
            f"API executable not found at {api_exe}. Please run 'cv build-api' first."
        )
        sys.exit(1)

    cmd = ["devenv", "shell", api_exe] + ctx.args
    subprocess.run(cmd, check=False)


@app.command(
    name="serve",
    context_settings={"allow_extra_args": True, "ignore_unknown_options": True},
)
def serve(ctx: typer.Context):
    """Serve the static frontend and the API server together for testing."""
    import http.server
    import socketserver
    import threading

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

    serve_api(ctx)


@app.command(name="test-api")
def test_api():
    """Run the Rust API unit tests."""
    print("Running Rust API tests...")
    subprocess.run(["cargo", "test"], cwd="src/rust", check=True)


def main():
    app()


if __name__ == "__main__":
    main()
