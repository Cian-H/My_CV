import ssl
import json
import urllib.error
import urllib.request

from src.python.models import Employment, Publication


def fetch_orcid_data(orcid_id: str) -> tuple[list[Publication], list[Employment]]:
    return fetch_orcid_works(orcid_id), fetch_orcid_employments(orcid_id)


def fetch_orcid_works(orcid_id: str) -> list[Publication]:
    url = f"https://pub.orcid.org/v3.0/{orcid_id}/works"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})

    try:
        with urllib.request.urlopen(
            req, context=ssl._create_unverified_context()
        ) as response:
            data = json.loads(response.read().decode())
    except urllib.error.URLError as e:
        print(f"Error fetching works from ORCID: {e}")
        return []

    publications = []
    if "group" not in data:
        return publications

    for group in data["group"]:
        if not group.get("work-summary"):
            continue

        work = group["work-summary"][0]

        title = ""
        if (
            "title" in work
            and work["title"]
            and "title" in work["title"]
            and work["title"]["title"]
        ):
            title = work["title"]["title"].get("value", "")

        year = ""
        if (
            "publication-date" in work
            and work["publication-date"]
            and "year" in work["publication-date"]
            and work["publication-date"]["year"]
        ):
            year = work["publication-date"]["year"].get("value", "")

        journal = ""
        if (
            "journal-title" in work
            and work["journal-title"]
            and "value" in work["journal-title"]
        ):
            journal = work["journal-title"]["value"]

        doi = None
        if (
            "external-ids" in work
            and work["external-ids"]
            and "external-id" in work["external-ids"]
        ):
            for ext_id in work["external-ids"]["external-id"]:
                if ext_id.get("external-id-type") == "doi":
                    doi = ext_id.get("external-id-value")
                    break

        url_str = None
        if "url" in work and work["url"] and "value" in work["url"]:
            url_str = work["url"]["value"]

        publications.append(
            Publication(title=title, year=year, journal=journal, doi=doi, url=url_str)
        )

    publications.sort(key=lambda x: x.year, reverse=True)
    return publications


def fetch_orcid_employments(orcid_id: str) -> list[Employment]:
    url = f"https://pub.orcid.org/v3.0/{orcid_id}/employments"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})

    try:
        with urllib.request.urlopen(
            req, context=ssl._create_unverified_context()
        ) as response:
            data = json.loads(response.read().decode())
    except urllib.error.URLError as e:
        print(f"Error fetching employments from ORCID: {e}")
        return []

    employments = []
    if "affiliation-group" not in data:
        return employments

    for group in data["affiliation-group"]:
        if not group.get("summaries"):
            continue

        summary = group["summaries"][0]
        if "employment-summary" not in summary:
            continue

        emp = summary["employment-summary"]

        role = emp.get("role-title", "")
        dept = emp.get("department-name")
        org = emp.get("organization", {}).get("name", "")

        start_date = ""
        if emp.get("start-date"):
            y = emp["start-date"].get("year", {}).get("value", "")
            m = (
                emp["start-date"].get("month", {}).get("value", "")
                if emp["start-date"].get("month")
                else ""
            )
            start_date = f"{y}-{m}" if m else y

        end_date = None
        if emp.get("end-date"):
            y = emp["end-date"].get("year", {}).get("value", "")
            m = (
                emp["end-date"].get("month", {}).get("value", "")
                if emp["end-date"].get("month")
                else ""
            )
            end_date = f"{y}-{m}" if m else y

        employments.append(
            Employment(
                role=role,
                organization=org,
                department=dept,
                start_date=start_date,
                end_date=end_date,
            )
        )

    # sort by start date descending
    employments.sort(key=lambda x: x.start_date, reverse=True)
    return employments
