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


def sync(profile: str = "industry"):
    raw_dir = Path("content")

    data_dict = {
        path.stem: yaml.safe_load(path.read_text()) for path in raw_dir.glob("*.yaml")
    }

    data_dict = clean_empty_strings(data_dict)

    # We already read profiles.yaml into data_dict["profiles"] due to raw_dir.glob("*.yaml")
    # Let's extract it and build the correct structure
    profiles_config = data_dict.pop("profiles", {})
    if not isinstance(profiles_config, dict):
        profiles_config = {}

    profiles = {}
    for p_name, p_data in profiles_config.items():
        if p_data is None:
            p_data = {}
        profiles[p_name] = {"exclude": p_data.get("exclude", [])}

    for p in raw_dir.glob("profile*.typ"):
        name = p.stem.replace("profile_", "")
        if name == "profile":
            name = "default"
        if name not in profiles:
            profiles[name] = {"exclude": []}
        profiles[name]["text"] = p.read_text().strip()  # type: ignore

    data_dict.setdefault("personal_info", {})["profiles"] = profiles

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
