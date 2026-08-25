import subprocess

from src.python.data_adapter import DataAdapter


def generate_static(excludes: list[str] | None = None, profile: str = "industry"):
    adapter = DataAdapter("cv_data.h5")
    cv_data = adapter.load_cv()

    cv_dict = cv_data.model_dump(exclude_none=True)
    if "personal_info" in cv_dict and "profiles" in cv_dict["personal_info"]:
        profiles = cv_dict["personal_info"].pop("profiles")
        prof_data = profiles.get(profile, profiles.get("hybrid", profiles.get("default", {})))
        if isinstance(prof_data, str):
            prof_data = {"text": prof_data, "exclude": []}
        cv_dict["personal_info"]["profile"] = prof_data.get("text", "")
        if excludes is None or len(excludes) == 0:
            excludes = prof_data.get("exclude", [])
    if excludes:
        for exc in excludes:
            cv_dict.pop(exc, None)

    json_path = "build/cv_data.json"
    with open(json_path, "w") as f:
        import json

        f.write(json.dumps(cv_dict, indent=2))

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
