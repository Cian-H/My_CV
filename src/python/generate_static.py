import subprocess

from src.python.data_adapter import DataAdapter


def generate_static(
    excludes: list[str] | None = None,
    profile: str = "industry",
    filter_tags: list[str] | None = None,
):
    adapter = DataAdapter("cv_data.h5")
    cv_data = adapter.load_cv()

    cv_dict = cv_data.model_dump(exclude_none=True)
    if "personal_info" in cv_dict and "profiles" in cv_dict["personal_info"]:
        profiles = cv_dict["personal_info"].pop("profiles")
        prof_data = profiles.get(
            profile, profiles.get("hybrid", profiles.get("default", {}))
        )
        if isinstance(prof_data, str):
            prof_data = {"text": prof_data, "exclude": []}
        cv_dict["personal_info"]["profile"] = prof_data.get("text", "")
        if excludes is None or len(excludes) == 0:
            excludes = prof_data.get("exclude", [])
    if excludes:
        for exc in excludes:
            cv_dict.pop(exc, None)

    if filter_tags:
        filter_set = set(filter_tags)
        tag_sections = {"skills", "education", "projects", "service"}
        for sec in tag_sections:
            if sec in cv_dict and isinstance(cv_dict[sec], list):
                filtered_items = []
                for item in cv_dict[sec]:
                    if isinstance(item, dict):
                        item_tags = set(item.get("tags") or [])
                        item_techs = set(item.get("technologies") or [])
                        all_item_tags = item_tags.union(item_techs)
                        if filter_set.intersection(all_item_tags):
                            filtered_items.append(item)
                cv_dict[sec] = filtered_items

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

    # Check generated PDF page count
    pdf_path = "build/My_CV_Generated.pdf"
    try:
        import os
        import re
        if os.path.exists(pdf_path):
            with open(pdf_path, "rb") as pdf_file:
                pdf_bytes = pdf_file.read()
                # Typical Typst output format for page count
                match = re.search(rb"/Type\s*/Pages\s*/Count\s*(\d+)", pdf_bytes)
                if match:
                    pages = int(match.group(1))
                    if pages > 2:
                        print(f"\n⚠️  WARNING: Generated CV is {pages} pages long. You might want to trim some content to stay within 2 pages!")
    except Exception:
        pass


if __name__ == "__main__":
    generate_static()
