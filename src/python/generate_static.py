import subprocess

from src.python.data_adapter import DataAdapter


def generate_static(
    excludes: list[str] | None = None,
    profile: str = "industry",
    filter_tags: list[str] | None = None,
    exclude_tags: list[str] | None = None,
    output_path: str = "build/My_CV_Generated.pdf",
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

    if filter_tags or exclude_tags:
        filter_set = set(filter_tags) if filter_tags else None
        exclude_set = set(exclude_tags) if exclude_tags else None
        tag_sections = {"skills", "projects", "service", "experience"}
        for sec in tag_sections:
            if sec in cv_dict and isinstance(cv_dict[sec], list):
                filtered_items = []
                for item in cv_dict[sec]:
                    if isinstance(item, dict):
                        item_tags = set(item.get("tags") or [])
                        item_techs = set(item.get("technologies") or [])
                        all_item_tags = item_tags.union(item_techs)

                        # First check exclusion
                        if exclude_set and exclude_set.intersection(all_item_tags):
                            continue

                        # Then check inclusion (if specified)
                        if filter_set and sec != "experience":
                            if filter_set.intersection(all_item_tags):
                                filtered_items.append(item)
                        else:
                            filtered_items.append(item)
                cv_dict[sec] = filtered_items

    json_path = "build/cv_data.json"
    with open(json_path, "w") as f:
        import json

        f.write(json.dumps(cv_dict, indent=2))

    # Transform for clean-print-cv template
    clean_data = {}

    # Personal & Summary
    pi = cv_dict.get("personal_info", {})
    clean_data["personal"] = {
        "name": pi.get("name", ""),
        "title": pi.get("title", ""),
        "email": pi.get("email", ""),
        "phone": pi.get("phone", ""),
        "location": f"{pi.get('city', '')}, {pi.get('country', '')}".strip(", "),
        "linkedin": "",
        "github": "",
        "website": "",
        "scholar": "",
        "orcid": pi.get("orcid", ""),
    }
    for link in pi.get("links", []):
        name_lower = link.get("name", "").lower()
        if "github" in name_lower:
            clean_data["personal"]["github"] = link.get("url")
        elif "linkedin" in name_lower:
            clean_data["personal"]["linkedin"] = link.get("url")
        elif "scholar" in name_lower:
            clean_data["personal"]["scholar"] = link.get("url")
        elif "blog" in name_lower:
            clean_data["personal"]["website"] = link.get("url")

    clean_data["summary"] = pi.get("profile", "")

    # Skills
    if "skills" in cv_dict:
        skills_dict = {}
        for s in cv_dict["skills"]:
            cat = s.get("category", "Skills")
            if cat not in skills_dict:
                skills_dict[cat] = []
            skills_dict[cat].append(s.get("description") or s.get("name", ""))
        clean_data["skills"] = [
            {"category": k, "items": v} for k, v in skills_dict.items()
        ]

    # Experience
    if "experience" in cv_dict:
        clean_data["experience"] = []
        for e in cv_dict["experience"]:
            clean_data["experience"].append(
                {
                    "role": e.get("title", ""),
                    "company": e.get("organization", ""),
                    "location": e.get("location", ""),
                    "period": e.get("date", ""),
                    "highlights": e.get("bullets", []),
                }
            )
    elif "employment" in cv_dict:
        clean_data["experience"] = []
        for e in cv_dict["employment"]:
            period = e.get("start_date", "")
            if e.get("end_date"):
                period += f" - {e.get('end_date')}"
            else:
                period += " - Present"
            clean_data["experience"].append(
                {
                    "role": e.get("role", ""),
                    "company": e.get("organization", ""),
                    "location": e.get("department", ""),
                    "period": period,
                    "highlights": [],
                }
            )

    # Education
    if "education" in cv_dict:
        clean_data["education"] = []
        for e in cv_dict["education"]:
            clean_data["education"].append(
                {
                    "degree": e.get("degree", ""),
                    "institution": e.get("institution", ""),
                    "location": "",
                    "period": e.get("date", ""),
                    "details": e.get("description", ""),
                }
            )

    # Projects (or Publications mapped to projects)
    if "projects" in cv_dict:
        clean_data["projects"] = []
        for p in cv_dict["projects"]:
            clean_data["projects"].append(
                {
                    "name": p.get("name", ""),
                    "url": p.get("url", ""),
                    "description": p.get("description", ""),
                }
            )

    if "service" in cv_dict:
        clean_data["service"] = []
        for s in cv_dict["service"]:
            clean_data["service"].append(
                {
                    "role": s.get("role", ""),
                    "organization": s.get("organization", ""),
                    "date": s.get("date", ""),
                    "description": s.get("description", ""),
                }
            )

    if "certifications" in cv_dict:
        clean_data["certifications"] = []
        for c in cv_dict["certifications"]:
            clean_data["certifications"].append(
                {
                    "name": c.get("name", ""),
                    "issuer": c.get("issuer", ""),
                    "year": c.get("date", ""),
                    "url": c.get("url", ""),
                }
            )

    if "conferences" in cv_dict:
        clean_data["conferences"] = []
        for c in cv_dict["conferences"]:
            clean_data["conferences"].append(
                {
                    "name": c.get("name", ""),
                    "role": c.get("role", ""),
                    "date": c.get("date", ""),
                }
            )

    if "languages" in cv_dict:
        clean_data["languages"] = []
        for lang in cv_dict["languages"]:
            clean_data["languages"].append(
                {
                    "name": lang.get("name", ""),
                    "proficiency": lang.get("proficiency", ""),
                }
            )

    # Publications
    if "publications" in cv_dict:
        clean_data["publications"] = []
        for p in cv_dict["publications"]:
            clean_data["publications"].append(
                {
                    "title": p.get("title", ""),
                    "year": p.get("year", ""),
                    "journal": p.get("journal", ""),
                    "doi": p.get("doi", ""),
                    "url": p.get("url", ""),
                }
            )

    import re

    def get_sort_key(item, date_key="period"):
        date_str = item.get(date_key, "")
        if not date_str:
            return ((0, 0), (0, 0))
        parts = re.split(r"[-–—]", date_str)

        def parse_single(d_str):
            d_str = d_str.strip().lower()
            if "present" in d_str or "current" in d_str:
                return (9999, 99)
            year_match = re.search(r"\b(19|20)\d{2}\b", d_str)
            year = int(year_match.group(0)) if year_match else 0
            months = [
                "january",
                "february",
                "march",
                "april",
                "may",
                "june",
                "july",
                "august",
                "september",
                "october",
                "november",
                "december",
            ]
            month_idx = 0
            for i, m in enumerate(months):
                if re.search(rf"\b{m}\b", d_str):
                    month_idx = i + 1
                    break
            return (year, month_idx)

        start = parse_single(parts[0])
        end = parse_single(parts[-1])
        return (end, start)

    if "experience" in clean_data:
        clean_data["experience"].sort(
            key=lambda x: get_sort_key(x, "period"), reverse=True
        )
    if "education" in clean_data:
        clean_data["education"].sort(
            key=lambda x: get_sort_key(x, "period"), reverse=True
        )
    if "projects" in clean_data:
        # Projects don't usually have a date mapped, but if they do, we'd sort by it.
        # Actually projects in clean_data don't have dates mapped in my code, so skip or leave as is.
        pass
    if "service" in clean_data:
        clean_data["service"].sort(key=lambda x: get_sort_key(x, "date"), reverse=True)
    if "conferences" in clean_data:
        clean_data["conferences"].sort(
            key=lambda x: get_sort_key(x, "date"), reverse=True
        )
    if "certifications" in clean_data:
        clean_data["certifications"].sort(
            key=lambda x: get_sort_key(x, "year"), reverse=True
        )
    if "publications" in clean_data:
        clean_data["publications"].sort(
            key=lambda x: get_sort_key(x, "year"), reverse=True
        )

    with open("build/clean_cv_data.json", "w") as f:
        import json

        f.write(json.dumps(clean_data, indent=2))

    print("Compiling Typst PDF...")
    try:
        import typst

        typst.compile("src/typst/cv_template.typ", output=output_path, root=".")
        print(f"Successfully generated {output_path}")
    except Exception as e:  # noqa: BLE001
        print(f"Typst compilation failed: {e}")
        subprocess.run(
            [
                "typst",
                "compile",
                "--root",
                ".",
                "src/typst/cv_template.typ",
                output_path,
            ],
            check=False,
        )
        print("Fallback typst command line finished.")

    # Check generated PDF page count
    try:
        import os
        import re

        if os.path.exists(output_path):
            with open(output_path, "rb") as pdf_file:
                pdf_bytes = pdf_file.read()
                # Typical Typst output format for page count
                match = re.search(rb"/Type\s*/Pages\s*/Count\s*(\d+)", pdf_bytes)
                if match:
                    pages = int(match.group(1))
                    if pages > 2:
                        print(
                            f"\n⚠️  WARNING: Generated CV is {pages} pages long. You might want to trim some content to stay within 2 pages!"
                        )
    except Exception:  # noqa: BLE001, S110
        pass


if __name__ == "__main__":
    generate_static()
