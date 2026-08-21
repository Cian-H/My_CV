import typer
import subprocess
import sys
import os

from src.python.sync import sync
from src.python.generate_static import generate_static

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

@app.command(name="serve")
def run_app():
    """Run the interactive Streamlit CV app."""
    print("Running Streamlit app...")
    subprocess.run([sys.executable, "-m", "streamlit", "run", "src/python/app.py"])

def main():
    app()

if __name__ == "__main__":
    main()
