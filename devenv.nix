{ pkgs, config, ... }:

{
  env.HDF5_DIR = "${config.env.DEVENV_ROOT}/.devenv/profile";

  packages = [
    pkgs.cargo
    pkgs.clippy
    pkgs.hdf5_1_10
    pkgs.nodejs
    pkgs.pkg-config
    pkgs.prettier
    pkgs.ruff
    pkgs.rustc
    pkgs.rustfmt
    pkgs.ty
    pkgs.typst
    pkgs.typstyle
    pkgs.uv
  ];

  scripts.fmt.exec = ''
    echo "Formatting Python..."
    ruff format .
    echo "Formatting Rust..."
    (cd src/rust && cargo fmt)
    echo "Formatting Typst..."
    find . -name "*.typ" -exec typstyle -i {} \;
    echo "Formatting YAML & HTML..."
    npx -y prettier --write "**/*.{yaml,yml,html}"
    echo "Format complete!"
  '';

  scripts.check.exec = ''
    echo "Linting Python..."
    ruff check .
    echo "Typechecking Python..."
    ty check .
    echo "Checking Rust..."
    (cd src/rust && cargo clippy -- -D warnings)
    echo "Checking YAML & HTML..."
    prettier --check "**/*.{yaml,yml,html}"
    echo "Checks complete!"
  '';
}
