from pathlib import Path

import yaml

from src.python.data_adapter import DataAdapter
from src.python.models import CVData


def clean_empty_strings(obj):
    if isinstance(obj, dict):
        return {k: None if v == "" else clean_empty_strings(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_empty_strings(x) for x in obj]
    return obj


def sync():
    raw_dir = Path("content")

    data_dict = {
        path.stem: yaml.safe_load(path.read_text()) for path in raw_dir.glob("*.yaml")
    }

    data_dict = clean_empty_strings(data_dict)

    if (profile_path := raw_dir / "profile.typ").exists():
        data_dict.setdefault("personal_info", {})["profile"] = (
            profile_path.read_text().strip()
        )

    orcid_url = data_dict.get("personal_info", {}).get("orcid", "")
    if orcid_id := (orcid_url.split("/")[-1] if orcid_url else ""):
        print(f"Fetching publications and employment from ORCID: {orcid_id}...")
        from src.python.sources.orcid import fetch_orcid_data

        pubs, emps = fetch_orcid_data(orcid_id)
        data_dict["publications"] = pubs
        data_dict["employment"] = emps

    cv = CVData(**data_dict)

    adapter = DataAdapter("cv_data.h5")
    adapter.save_cv(cv)
    print("Successfully synchronized data to cv_data.h5")


if __name__ == "__main__":
    sync()
