{ pkgs }: {
  deps = [
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.libxml2
    pkgs.libxslt
  ];
}
