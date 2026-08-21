import subprocess

from src.python.data_adapter import DataAdapter


def generate_static():
    adapter = DataAdapter("cv_data.h5")
    cv_data = adapter.load_cv()

    json_path = "build/cv_data.json"
    with open(json_path, "w") as f:
        f.write(cv_data.model_dump_json(indent=2))

    print("Compiling Typst PDF...")
    try:
        import typst

        typst.compile(
            "src/typst/cv_template.typ", output="build/My_CV_Generated.pdf", root="."
        )
        print("Successfully generated build/My_CV_Generated.pdf")
    except Exception as e:  # noqa: BLE001
        print(f"Typst compilation failed: {e}")
        subprocess.run(
            [
                "typst",
                "compile",
                "--root",
                ".",
                "src/typst/cv_template.typ",
                "build/My_CV_Generated.pdf",
            ],
            check=False,
        )
        print("Fallback typst command line finished.")


if __name__ == "__main__":
    generate_static()
