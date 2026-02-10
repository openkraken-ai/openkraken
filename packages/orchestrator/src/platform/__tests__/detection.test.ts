/**
 * Platform Detection Tests
 * 
 * Unit tests for platform detection functionality.
 * Uses Bun's native test runner.
 */

import { describe, it, expect } from 'bun:test';
import {
  detectPlatform,
  detectArchitecture,
  detectPlatformVersion,
  mapDarwinVersion,
  isLinux,
  isMacOS,
  isWindows,
  isUnixLike,
  detectEnvironment,
  detectDBusAvailable,
  detectHeadless,
} from '../detection';

describe('detectPlatform', () => {
  it('should return linux for Linux platform', () => {
    const platform = detectPlatform();
    // This will vary depending on actual platform, so we just check it's a valid value
    expect(['linux', 'darwin', 'windows', 'unknown']).toContain(platform);
  });
});

describe('detectArchitecture', () => {
  it('should return current architecture', () => {
    const arch = detectArchitecture();
    expect(['x64', 'arm64', 'ia32', 'arm']).toContain(arch);
  });
});

describe('mapDarwinVersion', () => {
  it('should map Darwin 23.x to macOS Sonoma', () => {
    expect(mapDarwinVersion('23.3.0')).toBe('macOS 14.x (Sonoma)');
  });

  it('should map Darwin 22.x to macOS Ventura', () => {
    expect(mapDarwinVersion('22.6.0')).toBe('macOS 13.x (Ventura)');
  });

  it('should map Darwin 21.x to macOS Monterey', () => {
    expect(mapDarwinVersion('21.6.0')).toBe('macOS 12.x (Monterey)');
  });

  it('should handle unknown Darwin versions', () => {
    const result = mapDarwinVersion('18.0.0');
    expect(result).toContain('Darwin');
  });
});

describe('Type Guards', () => {
  describe('isLinux', () => {
    it('should return true for linux', () => {
      expect(isLinux('linux')).toBe(true);
    });

    it('should return false for darwin', () => {
      expect(isLinux('darwin')).toBe(false);
    });

    it('should return false for windows', () => {
      expect(isLinux('windows')).toBe(false);
    });
  });

  describe('isMacOS', () => {
    it('should return true for darwin', () => {
      expect(isMacOS('darwin')).toBe(true);
    });

    it('should return false for linux', () => {
      expect(isMacOS('linux')).toBe(false);
    });
  });

  describe('isWindows', () => {
    it('should return true for windows', () => {
      expect(isWindows('windows')).toBe(true);
    });

    it('should return false for linux', () => {
      expect(isWindows('linux')).toBe(false);
    });
  });
});

describe('isUnixLike', () => {
  it('should return true for Linux', () => {
    if (detectPlatform() === 'linux') {
      expect(isUnixLike()).toBe(true);
    }
  });

  it('should return true for macOS', () => {
    if (detectPlatform() === 'darwin') {
      expect(isUnixLike()).toBe(true);
    }
  });

  it('should return false for Windows', () => {
    if (detectPlatform() === 'windows') {
      expect(isUnixLike()).toBe(false);
    }
  });
});

describe('detectEnvironment', () => {
  it('should include isNixOS in environment info', () => {
    const env = detectEnvironment();

    expect(env).toHaveProperty('isNixOS');
    expect(typeof env.isNixOS).toBe('boolean');
  });

  it('should have all required environment properties', () => {
    const env = detectEnvironment();

    expect(env).toHaveProperty('platform');
    expect(env).toHaveProperty('platformVersion');
    expect(env).toHaveProperty('arch');
    expect(env).toHaveProperty('isWSL');
    expect(env).toHaveProperty('isDocker');
    expect(env).toHaveProperty('isRoot');
    expect(env).toHaveProperty('isNixOS');
    expect(env).toHaveProperty('isDBusAvailable');
    expect(env).toHaveProperty('isHeadless');
  });
});

describe('detectDBusAvailable', () => {
  it('should export detectDBusAvailable function', () => {
    expect(typeof detectDBusAvailable).toBe('function');
  });

  it('should return boolean', () => {
    const result = detectDBusAvailable();
    expect(typeof result).toBe('boolean');
  });
});

describe('detectHeadless', () => {
  it('should export detectHeadless function', () => {
    expect(typeof detectHeadless).toBe('function');
  });

  it('should return boolean', () => {
    const result = detectHeadless();
    expect(typeof result).toBe('boolean');
  });
});
