{
  description = "OpenKraken - Deterministic Security-First Agentic Runtime";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    flake-utils.url = "github:numtide/flake-utils";
    devenv.url = "github:cachix/devenv/latest";
    nix-darwin.url = "github:LnL7/nix-darwin";
    nix-darwin.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, nixpkgs, flake-utils, devenv, nix-darwin }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
      in
      {
        packages = {
          openkraken-orchestrator = pkgs.callPackage ./nix/package.nix {
            bun = pkgs.bun;
          };
          openkraken-gateway = pkgs.callPackage ./nix/gateway-package.nix {
            go = pkgs.go_1_25;
          };
        };

        devShells.default = pkgs.callPackage ./nix/shell.nix {
          inherit devenv;
        };

        nixosModules.openkraken = import ./nix/nixos-modules/openkraken.nix;
        darwinModules.openkraken = import ./nix/darwin-modules/openkraken.nix;
      }
    );
}
