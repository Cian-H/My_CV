{
  pkgs,
  config,
  ...
}: {
  env.HDF5_DIR = "${config.env.DEVENV_ROOT}/.devenv/profile";
  env.RUSTFLAGS = "-C link-args=-Wl,-rpath,${config.env.DEVENV_ROOT}/.devenv/profile/lib";
  env.LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
    pkgs.stdenv.cc.cc.lib
    pkgs.libGL
    pkgs.libxkbcommon
    pkgs.fontconfig
    pkgs.freetype
    pkgs.zlib
    pkgs.xorg.libX11
    pkgs.xorg.libXcursor
    pkgs.xorg.libxcb
    pkgs.xorg.libXi
    pkgs.xorg.libXext
    pkgs.wayland
    pkgs.dbus
    pkgs.glib
  ];

  packages = [
    pkgs.cargo
    pkgs.deno
    pkgs.clippy
    pkgs.hdf5_1_10
    pkgs.nodejs
    pkgs.pkg-config
    pkgs.prek
    pkgs.prettier
    pkgs.ruff
    pkgs.rustc
    pkgs.rustfmt
    pkgs.ty
    pkgs.typst
    pkgs.typstyle
    pkgs.uv
  ];

  scripts.format-all.exec = ''
    echo "Formatting Python..."
    ruff format .
    echo "Formatting Rust..."
    (cd src/rust && cargo fmt)
    echo "Formatting Typst..."
    find . -name "*.typ" -exec typstyle -i {} \;
    echo "Formatting Typescript..."
    deno fmt .
    echo "Formatting YAML & HTML..."
    prettier --write "**/*.{yaml,yml,html}"
    echo "Format complete!"
  '';

  scripts.check-all.exec = ''
    echo "Linting Python..."
    ruff check .
    echo "Typechecking Python..."
    ty check .
    echo "Checking Rust..."
    (cd src/rust && cargo clippy -- -D warnings)
    echo "Linting Typescript..."
    deno lint .
    echo "Typechecking Typescript..."
    deno check .
    echo "Checking YAML & HTML..."
    prettier --check "**/*.{yaml,yml,html}"
    echo "Checks complete!"
  '';
}
