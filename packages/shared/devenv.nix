{ pkgs, lib, config, ... }:
{
  # Common packages for all packages (including nix-tree for dependency visualization)
  packages = with pkgs; [
    git
    jq
    just # Command runner
    parallel # Parallel execution
    nix-tree # Interactive Nix store dependency graph viewer
  ];

  # Pre-commit hooks
  git-hooks.hooks = {
    nixpkgs-fmt.enable = true;
    typos.enable = true;
  };

  # Common environment variables
  env = {
    OPENKRAKEN_ENV = "development";
    OPENKRAKEN_HOME = "./storage";
  };

  # Common scripts
  scripts = {
    build.exec = "just build";
    test.exec = "just test";
    lint.exec = "just lint";
  };
}
