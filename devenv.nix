{ pkgs, lib, config, ... }:

{
  # Import shared configuration and services
  imports = [
    ./packages/shared/devenv.nix
    ./services/local-development.nix
  ];

  # Root-level scripts are inherited from packages/shared/devenv.nix
  # https://devenv.sh/reference/options/
}
