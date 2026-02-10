/**
 * Tilde Expansion Tests
 * 
 * Unit tests for tilde expansion utilities.
 * Uses Bun's native test runner.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  expandTilde,
  expandTildeSafe,
  expandTildeValidated,
  expandTildeBatch,
  needsTildeExpansion,
} from '../paths/expand';

describe('expandTilde', () => {
  beforeEach(() => {
    // Mock homedir is handled by the function itself
  });

  it('should expand tilde to home directory', () => {
    const result = expandTilde('~/Documents');
    expect(result).toContain('/');
    expect(result).toContain('Documents');
    expect(result).not.toContain('~');
  });

  it('should handle pure tilde', () => {
    const result = expandTilde('~');
    expect(result).not.toContain('~');
  });

  it('should handle tilde with trailing slash', () => {
    const result = expandTilde('~/');
    expect(result).not.toContain('~');
  });

  it('should return absolute paths unchanged', () => {
    const result = expandTilde('/absolute/path');
    expect(result).toBe('/absolute/path');
  });

  it('should return paths without tilde unchanged', () => {
    const result = expandTilde('relative/path');
    expect(result).toBe('relative/path');
  });

  it('should expand nested tilde paths', () => {
    const result = expandTilde('~/Library/Application Support/Openkraken');
    expect(result).not.toContain('~');
    expect(result).toContain('Library');
  });

  it('should handle empty string', () => {
    const result = expandTilde('');
    expect(result).toBe('');
  });

  it('should handle paths with multiple tildes', () => {
    const result = expandTilde('~~/test');
    expect(result).toBe('~~/test');
  });
});

describe('expandTildeSafe', () => {
  it('should return expanded path and expanded true flag', () => {
    const result = expandTildeSafe('~/Documents');
    
    expect(result.path).not.toContain('~');
    expect(result.expanded).toBe(true);
    expect(result.original).toBe('~/Documents');
  });

  it('should return expanded false for non-tilde paths', () => {
    const result = expandTildeSafe('/absolute/path');
    
    expect(result.path).toBe('/absolute/path');
    expect(result.expanded).toBe(false);
  });
});

describe('expandTildeValidated', () => {
  it('should return expanded path', () => {
    const result = expandTildeValidated('~/Documents');
    expect(result).not.toContain('~');
  });
});

describe('expandTildeBatch', () => {
  it('should expand multiple paths', () => {
    const paths = ['~/Documents', '~/Pictures', '~/Music'];
    const result = expandTildeBatch(paths);
    
    expect(result[0]).not.toContain('~');
    expect(result[1]).not.toContain('~');
    expect(result[2]).not.toContain('~');
  });

  it('should handle mixed paths', () => {
    const paths = ['~/Documents', '/absolute/path', 'relative/path'];
    const result = expandTildeBatch(paths);
    
    expect(result[0]).not.toContain('~');
    expect(result[1]).toBe('/absolute/path');
    expect(result[2]).toBe('relative/path');
  });

  it('should handle empty array', () => {
    const result = expandTildeBatch([]);
    expect(result).toEqual([]);
  });
});

describe('needsTildeExpansion', () => {
  it('should return true for tilde-prefixed paths', () => {
    expect(needsTildeExpansion('~/Documents')).toBe(true);
  });

  it('should return false for absolute paths', () => {
    expect(needsTildeExpansion('/absolute/path')).toBe(false);
  });

  it('should return false for relative paths', () => {
    expect(needsTildeExpansion('relative/path')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(needsTildeExpansion('')).toBe(false);
  });

  it('should return false for paths with tilde in middle', () => {
    expect(needsTildeExpansion('/path~/to/file')).toBe(false);
  });
});
