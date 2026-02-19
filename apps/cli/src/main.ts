/**
 * OpenKraken CLI Entry Point
 *
 * Command-line interface for OpenKraken agent orchestrator.
 */

import { createApiClient } from "./lib/api.js";
import { createAuthManager } from "./lib/auth.js";
import { commands, getHelp } from "./commands/index.js";

const DEFAULT_ORCHESTRATOR_URL = "http://localhost:3000";

interface CliOptions {
  orchestratorUrl?: string;
  help?: boolean;
}

function parseArgs(args: string[]): { command: string; args: string[]; options: CliOptions } {
  const options: CliOptions = {};
  const positional: string[] = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      i++;
      continue;
    }

    if (arg === "--url") {
      if (i + 1 >= args.length) {
        console.error("Error: --url requires a value");
        process.exit(1);
      }
      options.orchestratorUrl = args[i + 1];
      i += 2;
      continue;
    }

    positional.push(arg);
    i++;
  }

  return {
    command: positional[0] ?? "help",
    args: positional.slice(1),
    options,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const { command, args: cmdArgs, options } = parseArgs(args);

  if (options.help) {
    console.log("OpenKraken CLI");
    console.log("==============\n");
    console.log("Usage: openkraken [options] <command> [args]\n");
    console.log("Options:");
    console.log("  --url <url>    Orchestrator URL (default: http://localhost:3000)");
    console.log("  --help, -h     Show this help\n");
    console.log(getHelp());
    return;
  }

  // Create API client
  const orchestratorUrl = options.orchestratorUrl ?? DEFAULT_ORCHESTRATOR_URL;
  const api = createApiClient({ baseUrl: orchestratorUrl });

  // Load auth token
  const auth = createAuthManager();
  const token = auth.loadToken();
  if (token) {
    api.setToken(token);
  }

  // Dispatch command
  const cmd = commands[command];

  if (!cmd) {
    console.error(`Unknown command: ${command}`);
    console.log(`Run 'openkraken --help' for usage information`);
    process.exit(1);
  }

  try {
    await cmd.execute(api, ...cmdArgs);
  } catch (error) {
    console.error("Command failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
