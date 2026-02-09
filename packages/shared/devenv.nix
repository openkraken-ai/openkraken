{ pkgs, lib, config, ... }:
{
  # Common packages for all packages
  packages = with pkgs; [
    git
    jq
    just          # Command runner
    parallel      # Parallel execution
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
