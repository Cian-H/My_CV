{pkgs, ...}: {
  packages = [
    pkgs.uv
    pkgs.typst
    pkgs.rustc
    pkgs.cargo
    pkgs.hdf5_1_10
    pkgs.pkg-config
  ];
}
