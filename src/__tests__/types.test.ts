import { describe, it, expect } from 'vitest';
import { DEFAULT_TASK_LIMIT } from '../types.js';

describe('DEFAULT_TASK_LIMIT', () => {
  it('should be 500', () => {
    expect(DEFAULT_TASK_LIMIT).toBe(500);
  });

  it('should be a reasonable positive number', () => {
    expect(DEFAULT_TASK_LIMIT).toBeGreaterThan(0);
    expect(DEFAULT_TASK_LIMIT).toBeLessThanOrEqual(10000);
  });
});

describe('Core Data Epoch conversion', () => {
  // Core Data uses 2001-01-01 as epoch, Unix uses 1970-01-01
  const CORE_DATA_EPOCH_MS = new Date("2001-01-01T00:00:00Z").getTime();
  const UNIX_EPOCH_MS = 0;

  it('should calculate correct epoch difference', () => {
    const diffYears = (CORE_DATA_EPOCH_MS - UNIX_EPOCH_MS) / (1000 * 60 * 60 * 24 * 365.25);
    expect(Math.round(diffYears)).toBe(31);
  });

  it('should convert Unix timestamp to Core Data timestamp', () => {
    const unixTimestamp = Date.now();
    const coreDataTimestamp = (unixTimestamp - CORE_DATA_EPOCH_MS) / 1000;

    // Core Data timestamp should be smaller (fewer seconds since its later epoch)
    expect(coreDataTimestamp).toBeLessThan(unixTimestamp / 1000);
  });

  it('should convert known date correctly', () => {
    // January 1, 2025 00:00:00 UTC
    const testDate = new Date("2025-01-01T00:00:00Z");
    const coreDataTimestamp = (testDate.getTime() - CORE_DATA_EPOCH_MS) / 1000;

    // 24 years in seconds (approximately)
    const expectedApprox = 24 * 365.25 * 24 * 60 * 60;
    expect(coreDataTimestamp).toBeGreaterThan(expectedApprox * 0.99);
    expect(coreDataTimestamp).toBeLessThan(expectedApprox * 1.01);
  });

  it('should handle Core Data epoch date (zero timestamp)', () => {
    const epochDate = new Date("2001-01-01T00:00:00Z");
    const coreDataTimestamp = (epochDate.getTime() - CORE_DATA_EPOCH_MS) / 1000;
    expect(coreDataTimestamp).toBe(0);
  });
});
