from pathlib import Path

import yaml

from src.python.data_adapter import DataAdapter
from src.python.models import (
    CVData,
    Education,
    Experience,
    PersonalInfo,
    Skill,
)


def sync():
    raw_dir = Path("content")

    # Load personal info
    with open(raw_dir / "personal_info.yaml", "r") as f:
        p_info_data = yaml.safe_load(f)

    # Load profile
    with open(raw_dir / "profile.typ", "r") as f:
        p_info_data["profile"] = f.read().strip()

    personal_info = PersonalInfo(**p_info_data)

    # Load skills
    with open(raw_dir / "skills.yaml", "r") as f:
        skills_data = yaml.safe_load(f)
    skills = [Skill(**s) for s in skills_data]

    # Load experience
    with open(raw_dir / "experience.yaml", "r") as f:
        exp_data = yaml.safe_load(f)
    experience = [Experience(**e) for e in exp_data]

    # Load education
    with open(raw_dir / "education.yaml", "r") as f:
        edu_data = yaml.safe_load(f)
    # Filter out None descriptions to match previous logic or just pass it
    for e in edu_data:
        if e.get("description") == "":
            e["description"] = None
    education = [Education(**e) for e in edu_data]

    orcid_url = personal_info.orcid
    orcid_id = orcid_url.split("/")[-1] if orcid_url else ""

    publications = []
    employments = []
    if orcid_id:
        print(f"Fetching publications and employment from ORCID: {orcid_id}...")
        from src.python.sources.orcid import fetch_orcid_data

        publications, employments = fetch_orcid_data(orcid_id)

    cv = CVData(
        personal_info=personal_info,
        skills=skills,
        experience=experience,
        education=education,
        publications=publications,
        employment=employments,
    )

    adapter = DataAdapter("cv_data.h5")
    adapter.save_cv(cv)
    print("Successfully synchronized data to cv_data.h5")


if __name__ == "__main__":
    sync()
