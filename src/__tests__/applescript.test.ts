import { describe, it, expect } from 'vitest';
import { escapeAppleScriptString } from '../providers/applescript.js';

describe('escapeAppleScriptString', () => {
  it('should return empty string for empty input', () => {
    expect(escapeAppleScriptString('')).toBe('');
  });

  it('should pass through regular text unchanged', () => {
    expect(escapeAppleScriptString('Hello World')).toBe('Hello World');
  });

  it('should escape double quotes', () => {
    expect(escapeAppleScriptString('Say "Hello"')).toBe('Say \\"Hello\\"');
  });

  it('should escape backslashes', () => {
    expect(escapeAppleScriptString('path\\to\\file')).toBe('path\\\\to\\\\file');
  });

  it('should escape newlines', () => {
    expect(escapeAppleScriptString('line1\nline2')).toBe('line1\\nline2');
  });

  it('should escape carriage returns', () => {
    expect(escapeAppleScriptString('line1\rline2')).toBe('line1\\rline2');
  });

  it('should escape tabs', () => {
    expect(escapeAppleScriptString('col1\tcol2')).toBe('col1\\tcol2');
  });

  it('should handle multiple escapes together', () => {
    const input = 'Say "Hello"\nPath: C:\\Users\\test';
    const expected = 'Say \\"Hello\\"\\nPath: C:\\\\Users\\\\test';
    expect(escapeAppleScriptString(input)).toBe(expected);
  });

  it('should handle unicode characters', () => {
    expect(escapeAppleScriptString('Task: Köpa mjölk 🥛')).toBe('Task: Köpa mjölk 🥛');
  });

  it('should handle special punctuation', () => {
    expect(escapeAppleScriptString("It's a task, isn't it?")).toBe("It's a task, isn't it?");
  });
});
