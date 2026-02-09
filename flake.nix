{
  description = "OpenKraken - Deterministic Security-First Agentic Runtime";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    flake-utils.url = "github:numtide/flake-utils";
    bun.url = "github:oven-sh/bun";
  };

  outputs = { self, nixpkgs, flake-utils, bun }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import (bun + "/flake.nix")) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };
      in
      {
        # Package outputs for this system
        packages = {
          inherit (pkgs) bun;
        };

        devShells = {
          default = pkgs.devenv.shell {
            inherit (self.inputs) nixpkgs;
          };
        };
      }
    );
}
