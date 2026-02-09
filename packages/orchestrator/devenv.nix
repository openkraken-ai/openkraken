{ pkgs, lib, config, ... }:
{
  # Import shared configuration for common packages, env vars, and scripts
  imports = [
    ../shared/devenv.nix
  ];

  # JavaScript runtime - Bun
  # Note: Bun version 1.3.8 specified in TechSpec. Use bun overlay from flake.nix
  languages.javascript = {
    enable = true;
    bun = {
      enable = true;
      package = pkgs.bun;
    };
  };

  # TypeScript support
  languages.typescript.enable = true;

  # Environment variables specific to orchestrator
  env = {
    ORCHESTRATOR_PORT = "3000";
    DATABASE_PATH = "./storage/data/openkraken.db";
    SANDBOX_PATH = "./storage/sandbox";
  };

  # SQLite service for development database
  services.sqlite.enable = true;

  # Development scripts
  scripts = {
    dev.exec = "bun run src/main.ts";
    test.exec = "bun test";
    migrate.exec = "bun run db:migrate";
    lint.exec = "biome lint src/";
  };

  # Orchestrator process definition
  processes.orchestrator = {
    exec = "bun run src/main.ts";
    cwd = "packages/orchestrator";
  };

  # Enter hook to initialize database and create storage directories
  enterHook = ''
    # Create storage directories if they don't exist
    mkdir -p ./storage/data
    mkdir -p ./storage/sandbox

    # Initialize database with schema if it doesn't exist
    if [ ! -f ./storage/data/openkraken.db ]; then
      echo "Initializing database schema..."
      ./packages/orchestrator/scripts/init-db.sh
    else
      echo "Database already exists at ./storage/data/openkraken.db"
    fi
  '';
}
