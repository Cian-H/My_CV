from magicgui.widgets import ComboBox, Container, Label, LineEdit, PushButton

from src.python.cli import build_api, build_frontend, generate_static_cmd, sync_cmd


def launch_gui():
    # We will create magicgui widgets manually for better control

    header = Label(value="<h1>CV Generator Configurator</h1>")

    # Sync
    sync_profile = ComboBox(
        choices=["general", "academic", "industry"], value="general", label="Profile"
    )
    sync_btn = PushButton(text="Sync YAML -> HDF5")

    @sync_btn.clicked.connect
    def on_sync():
        sync_btn.text = "Syncing..."
        try:
            sync_cmd(sync_profile.value)
        finally:
            sync_btn.text = "Sync YAML -> HDF5"

    sync_container = Container(
        widgets=[Label(value="<b>Sync Data</b>"), sync_profile, sync_btn],
        layout="horizontal",
    )

    # Build Static
    static_profile = ComboBox(
        choices=["general", "academic", "industry"], value="general", label="Profile"
    )
    static_exclude = LineEdit(value="", label="Exclude (comma separated)")
    static_btn = PushButton(text="Build Static PDF")

    @static_btn.clicked.connect
    def on_static():
        static_btn.text = "Building..."
        try:
            generate_static_cmd(static_exclude.value, static_profile.value)
        finally:
            static_btn.text = "Build Static PDF"

    static_container = Container(
        widgets=[
            Label(value="<b>Build PDF</b>"),
            static_profile,
            static_exclude,
            static_btn,
        ],
        layout="horizontal",
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
        widgets=[Label(value="<b>Build Tools</b>"), frontend_btn, api_btn],
        layout="horizontal",
    )

    main_container = Container(
        widgets=[header, sync_container, static_container, builds_container],
        labels=False,
    )

    main_container.show(run=True)
