import os
import subprocess
import typst
from src.python.data_adapter import DataAdapter

def generate_static():
    # Load data from HDF5
    adapter = DataAdapter("cv_data.h5")
    cv_data = adapter.load_cv()
    
    # Dump to JSON
    json_path = 'build/cv_data.json'
    with open(json_path, 'w') as f:
        f.write(cv_data.model_dump_json(indent=2))
        
    # Compile with Typst
    print("Compiling Typst PDF...")
    try:
        typst.compile("src/typst/cv_template.typ", output="build/My_CV_Generated.pdf", root=".")
        print("Successfully generated build/My_CV_Generated.pdf")
    except Exception as e:
        print(f"Typst compilation failed: {e}")
        # fallback to command line typst
        subprocess.run(["typst", "compile", "--root", ".", "src/typst/cv_template.typ", "build/My_CV_Generated.pdf"])
        print("Fallback typst command line finished.")

if __name__ == "__main__":
    generate_static()
