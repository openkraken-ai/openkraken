{ pkgs ? import <nixpkgs> { }
, devenv ? pkgs.devenv
}:

pkgs.mkShell {
  packages = with pkgs; [
    bun
    go_1_25
    direnv
    nix
    git
    jq
    just
    parallel
    fd
    ripgrep
  ];

  shellHook = ''
    # Load devenv environment
    export OPENKRAKEN_ENV="development"
    export OPENKRAKEN_HOME="./storage"
  '';
}
