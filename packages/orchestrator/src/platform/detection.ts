/**
 * Platform Detection Module
 */

import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import type { EnvironmentInfo, OperatingSystem } from "./paths/types";
import { isOperatingSystem } from "./paths/types";

/**
 * Detects the current runtime environment
 */
export function detectEnvironment(): EnvironmentInfo {
  const platform = detectPlatform();
  const platformVersion = detectPlatformVersion(platform);
  const arch = detectArchitecture();
  const isWSL = detectWSL();
  const isDocker = detectDocker();
  const isRoot = detectRootPrivileges();
  const isNixOS = detectNixOS();
  const isDBusAvailable = detectDBusAvailable();
  const isHeadless = detectHeadless();

  return {
    platform,
    platformVersion,
    arch,
    isWSL,
    isDocker,
    isRoot,
    isNixOS,
    isDBusAvailable,
    isHeadless,
  };
}

/**
 * Detects the operating system platform
 */
export function detectPlatform(): OperatingSystem {
  const platform = process.platform;

  if (isOperatingSystem(platform)) {
    return platform;
  }

  // Fallback for unexpected platform values
  return "unknown";
}

/**
 * Detects CPU architecture
 */
export function detectArchitecture(): string {
  return process.arch;
}

/**
 * Gets the Darwin kernel version by running uname
 */
function getDarwinKernelVersion(): string | null {
  try {
    const version = execSync("/usr/bin/uname -r", { encoding: "utf-8" }).trim();
    return version || null;
  } catch {
    return null;
  }
}

/**
 * Gets the platform version string
 */
export function detectPlatformVersion(platform: OperatingSystem): string {
  switch (platform) {
    case "linux": {
      // Return kernel version
      return process.platform;
    }
    case "darwin": {
      // Get Darwin kernel version from uname
      const darwinVersion = getDarwinKernelVersion();
      if (darwinVersion) {
        return mapDarwinVersion(darwinVersion);
      }
      // Fallback to a generic macOS version
      return "macOS (unknown version)";
    }
    case "windows": {
      return process.platform;
    }
    default:
      return process.platform;
  }
}

/**
 * Maps Darwin kernel version to macOS release name
 */
export function mapDarwinVersion(darwinVersion: string): string {
  const major = Number.parseInt(darwinVersion.split(".")[0], 10);

  // Darwin versions to macOS mappings (year-based since 2011)
  // Darwin 25.x = macOS 16.x (Tahoe) / macOS 26.x (2025)
  // Darwin 24.x = macOS 15.x (Sequoia) (2024)
  // Darwin 23.x = macOS 14.x (Sonoma) (2023)
  // Darwin 22.x = macOS 13.x (Ventura) (2022)
  // Darwin 21.x = macOS 12.x (Monterey) (2021)
  // Darwin 20.x = macOS 11.x (Big Sur) (2020)
  // Darwin 19.x = macOS 10.15.x (Catalina) (2019)
  if (major >= 25) {
    return "macOS 16.x/26.x (Tahoe)";
  }
  if (major >= 24) {
    return "macOS 15.x (Sequoia)";
  }
  if (major >= 23) {
    return "macOS 14.x (Sonoma)";
  }
  if (major >= 22) {
    return "macOS 13.x (Ventura)";
  }
  if (major >= 21) {
    return "macOS 12.x (Monterey)";
  }
  if (major >= 20) {
    return "macOS 11.x (Big Sur)";
  }
  if (major >= 19) {
    return "macOS 10.15.x (Catalina)";
  }
  return `macOS (Darwin ${darwinVersion})`;
}

/**
 * Detects Windows Subsystem for Linux
 */
export function detectWSL(): boolean {
  // Check for WSL-specific environment variables
  if (process.env.WSL_DISTRO_NAME !== undefined) {
    return true;
  }

  if (process.env.WSLINTEROP !== undefined) {
    return true;
  }

  // Check for Microsoft-specific kernel version markers
  try {
    const bunVersion = process.version?.toLowerCase() || "";
    if (bunVersion.includes("microsoft") || bunVersion.includes("wsl")) {
      return true;
    }
  } catch {
    // Ignore errors
  }

  // Check for WSL-specific path patterns
  if (process.env.PATH?.includes("\\Windows\\System32")) {
    return true;
  }

  return false;
}

/**
 * Detects Docker container environment
 */
export function detectDocker(): boolean {
  // Check for Docker-specific environment variables
  if (process.env.DOCKER_CONTAINER !== undefined) {
    return true;
  }

  if (process.env.DOCKER_VERSION !== undefined) {
    return true;
  }

  // Check for Docker-specific cgroup information
  try {
    const cgroup = readFileSync("/proc/self/cgroup", "utf8");
    if (
      cgroup.includes("docker") ||
      cgroup.includes("containerd") ||
      cgroup.includes("container")
    ) {
      return true;
    }
  } catch {
    // Not a Linux system or /proc not available
  }

  // Check for .dockerenv file
  try {
    statSync("/.dockerenv");
    return true;
  } catch {
    // File doesn't exist
  }

  return false;
}

/**
 * Detects if running with root privileges
 */
export function detectRootPrivileges(): boolean {
  // On POSIX systems, UID 0 is root
  if (typeof process.getuid === "function") {
    return process.getuid() === 0;
  }

  // On Windows, check for admin privileges
  if (process.platform === "win32") {
    return process.env.USERPROFILE?.toLowerCase().includes("admin") ?? false;
  }

  return false;
}

/**
 * Detects if running on NixOS
 */
export function detectNixOS(): boolean {
  // Check for the NixOS system profile path
  if (process.env.NIXOS_SYSTEM_PROFILE !== undefined) {
    return true;
  }

  // Check for /run/current-system which exists on NixOS
  try {
    statSync("/run/current-system");
    return true;
  } catch {
    // Not NixOS or /run not accessible
  }

  // Check for /etc/nixos/configuration.nix (NixOS config file location)
  try {
    readFileSync("/etc/nixos/configuration.nix", "utf8");
    return true;
  } catch {
    // Not NixOS
  }

  return false;
}

/**
 * Detects if D-Bus is available for secret-service operations
 */
export function detectDBusAvailable(): boolean {
  // Check for D-Bus session bus address
  const dbusAddress = process.env.DBUS_SESSION_BUS_ADDRESS;
  if (dbusAddress && dbusAddress.trim() !== "") {
    return true;
  }

  // Check for common D-Bus socket paths
  const dbusSockets = [
    "/run/user/bus", // User session D-Bus
    "/tmp/dbus-", // Temporary D-Bus sockets
    "/var/run/dbus/system_bus_socket", // System bus (less useful for secret-service)
  ];

  for (const socket of dbusSockets) {
    try {
      statSync(socket);
      return true;
    } catch {
      // Socket doesn't exist or isn't accessible
    }
  }

  // Check for running D-Bus daemon
  try {
    // Check if dbus-daemon or dbus-broker is running
    const result = execSync("pgrep -x dbus-daemon", { encoding: "utf-8" });
    if (result.trim().length > 0) {
      return true;
    }
  } catch {
    // dbus-daemon not running
  }

  return false;
}

/**
 * Detects if running in a headless environment
 */
export function detectHeadless(): boolean {
  // Check for common desktop environment indicators
  const desktopEnvironmentIndicators = [
    "DESKTOP_SESSION", // GNOME, KDE, XFCE, etc.
    "XDG_CURRENT_DESKTOP", // Desktop environment name
    "GDMSESSION", // GDM login session
    "GNOME_DESKTOP_SESSION_ID", // GNOME specific
    "KDE_FULL_SESSION", // KDE specific
    "SWAYSOCK", // Sway window manager
    "I3SOCK", // i3 window manager
    "WAYLAND_DISPLAY", // Wayland compositor
    "DISPLAY", // X11 display
  ];

  for (const indicator of desktopEnvironmentIndicators) {
    const value = process.env[indicator];
    if (value && value.trim() !== "") {
      // Desktop environment indicator found
      return false;
    }
  }

  // Check for graphical session type via systemd (loginctl)
  try {
    const output = execSync("loginctl show-session -p Type c1", {
      encoding: "utf-8",
    }).trim();
    // Graphical sessions are "x11" or "wayland"
    if (output === "x11" || output === "wayland") {
      return false;
    }
  } catch {
    // systemd-logind not available or not running
  }

  // No desktop environment indicators found = headless
  return true;
}

/**
 * Gets a human-readable summary of the environment
 */
export function getEnvironmentSummary(): string {
  const env = detectEnvironment();

  const parts: string[] = [
    `${env.platform} ${env.platformVersion}`,
    `${env.arch}`,
  ];

  if (env.isWSL) {
    parts.push("WSL");
  }

  if (env.isDocker) {
    parts.push("Docker");
  }

  if (env.isNixOS) {
    parts.push("NixOS");
  }

  if (env.isDBusAvailable) {
    parts.push("D-Bus");
  }

  if (env.isHeadless) {
    parts.push("Headless");
  }

  if (env.isRoot) {
    parts.push("root");
  }

  return parts.join(" | ");
}

/**
 * Type guard for checking if platform is Linux
 */
export function isLinux(platform: OperatingSystem): platform is "linux" {
  return platform === "linux";
}

/**
 * Type guard for checking if platform is macOS
 */
export function isMacOS(platform: OperatingSystem): platform is "darwin" {
  return platform === "darwin";
}

/**
 * Type guard for checking if platform is Windows
 */
export function isWindows(platform: OperatingSystem): platform is "windows" {
  return platform === "windows";
}

/**
 * Checks if running on a Unix-like system (Linux or macOS)
 */
export function isUnixLike(): boolean {
  const platform = detectPlatform();
  return platform === "linux" || platform === "darwin";
}
