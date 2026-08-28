import os
from pathlib import Path

import yaml
from magicgui.widgets import CheckBox, ComboBox, Container, Label, PushButton, Select

from src.python.cli import build_api, build_frontend, generate_static_cmd, sync_cmd
from src.python.models import CVData


def get_tags():
    tags = set()
    if os.path.exists("cv_data.h5"):
        try:
            from src.python.data_adapter import DataAdapter

            cv = DataAdapter("cv_data.h5").load_cv()
            for sec, items in cv.model_dump().items():
                if isinstance(items, list):
                    for item in items:
                        if isinstance(item, dict):
                            if item.get("tags"):
                                tags.update(item["tags"])
                            if item.get("technologies"):
                                tags.update(item["technologies"])
        except Exception:
            pass
    return sorted(list(tags))


def get_profiles():
    profiles_set = set()

    # Try HDF5 first
    if os.path.exists("cv_data.h5"):
        try:
            from src.python.data_adapter import DataAdapter

            cv = DataAdapter("cv_data.h5").load_cv()
            profiles_set.update(cv.personal_info.profiles.keys())
        except Exception:
            pass

    # Fallback / merge with content/
    raw_dir = Path("content")
    if raw_dir.exists():
        for p in raw_dir.glob("profile*.typ"):
            name = p.stem.replace("profile_", "")
            if name == "profile":
                name = "default"
            profiles_set.add(name)
        try:
            with open(raw_dir / "profiles.yaml") as f:
                p_data = yaml.safe_load(f)
                if p_data:
                    profiles_set.update(p_data.keys())
        except Exception:
            pass

    if not profiles_set:
        profiles_set = {"general", "academic", "industry"}
    return sorted(list(profiles_set))


def launch_gui():
    # We will create magicgui widgets manually for better control

    header = Label(
        value='<h1 align="center">Curriculum Vitaelor</h1><p align="center"><i>A slapdash data pipeline where 90% of the thought went into the pipeline and not the tooling</i></p><hr>'
    )

    profiles = get_profiles()

    # Sync
    sync_btn = PushButton(text="Sync YAML -> HDF5")

    @sync_btn.clicked.connect
    def on_sync():
        sync_btn.text = "Syncing..."
        try:
            sync_cmd()
        finally:
            sync_btn.text = "Sync YAML -> HDF5"

    sync_container = Container(
        widgets=[sync_btn],
        layout="vertical",
    )

    # Build Static
    static_profile = ComboBox(
        choices=profiles, value=profiles[0] if profiles else "", label="Profile"
    )

    sections = [
        k
        for k in CVData.model_fields.keys()
        if k not in ("personal_info", "project_hierarchy")
    ]
    toggles = {}
    for sec in sections:
        toggles[sec] = CheckBox(value=True, text=sec.replace("_", " ").title())

    half = (len(toggles) + 1) // 2
    col1 = Container(
        widgets=list(toggles.values())[:half], layout="vertical", labels=False
    )
    col2 = Container(
        widgets=list(toggles.values())[half:], layout="vertical", labels=False
    )
    toggles_container = Container(
        widgets=[col1, col2], layout="horizontal", labels=False
    )

    all_tags = get_tags()
    tag_select = Select(choices=all_tags, label="Filter Keywords\n(Empty = All)")

    static_btn = PushButton(text="Build Static PDF")
    warning_label = Label(value="")

    @static_btn.clicked.connect
    def on_static():
        static_btn.text = "Building..."
        warning_label.value = ""
        excludes = [sec for sec, checkbox in toggles.items() if not checkbox.value]
        exclude_str = ",".join(excludes)

        # tag_select.value is a tuple/list of selected choices
        selected_tags = tag_select.value
        tags_str = ",".join(selected_tags) if selected_tags else ""

        try:
            generate_static_cmd(exclude_str, static_profile.value, tags_str)

            import re

            pdf_path = "build/My_CV_Generated.pdf"
            if os.path.exists(pdf_path):
                with open(pdf_path, "rb") as pdf_file:
                    match = re.search(
                        rb"/Type\s*/Pages\s*/Count\s*(\d+)", pdf_file.read()
                    )
                    if match:
                        pages = int(match.group(1))
                        if pages > 2:
                            warning_label.value = f'<p style="color: red; font-weight: bold;" align="center">⚠️ WARNING: Generated CV is {pages} pages long.<br>You might want to trim some content!</p>'
                        else:
                            warning_label.value = f'<p style="color: green;" align="center">✅ Success! Generated CV is {pages} page(s).</p>'
        finally:
            static_btn.text = "Build Static PDF"

    static_container = Container(
        widgets=[
            static_profile,
            Label(value="<b>Include Sections:</b>"),
            toggles_container,
            tag_select,
            static_btn,
            warning_label,
        ],
        layout="vertical",
    )

    # Build Frontend & API
    frontend_btn = PushButton(text="Build Frontend")
    api_btn = PushButton(text="Build API")

    @frontend_btn.clicked.connect
    def on_frontend():
        frontend_btn.text = "Building..."
        try:
            build_frontend()
        finally:
            frontend_btn.text = "Build Frontend"

    @api_btn.clicked.connect
    def on_api():
        api_btn.text = "Building..."
        try:
            build_api()
        finally:
            api_btn.text = "Build API"

    builds_container = Container(
        widgets=[frontend_btn, api_btn],
        layout="vertical",
    )

    main_container = Container(
        widgets=[
            header,
            Label(value='<h2 align="center">Data Synchronization</h2>'),
            sync_container,
            Label(value='<hr><h2 align="center">PDF Generation</h2>'),
            static_container,
            Label(value='<hr><h2 align="center">Frontend & API</h2>'),
            builds_container,
        ],
        labels=False,
    )

    main_container.show(run=True)
