{ pkgs, lib, config, ... }:

{
  # Import shared configuration
  imports = [ ./packages/shared/devenv.nix ];

  # Root-level scripts (environment variables inherited from shared)
  scripts = {
    build.exec = "just build";
    test.exec = "just test";
    lint.exec = "just lint";
  };

  # https://devenv.sh/reference/options/
}
