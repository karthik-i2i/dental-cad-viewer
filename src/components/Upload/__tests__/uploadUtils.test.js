import { describe, expect, it } from 'vitest';
import { formatSize, validateFile } from '../utils';

describe('formatSize', () => {
  it('formats bytes, KB, and MB thresholds', () => {
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(2048)).toBe('2.0 KB');
    expect(formatSize(2 * 1024 * 1024)).toBe('2.00 MB');
  });
});

describe('validateFile', () => {
  it('accepts stl and ply under the size limit', () => {
    expect(
      validateFile({ name: 'scan.stl', size: 1024 })
    ).toBeNull();
    expect(
      validateFile({ name: 'scan.PLY', size: 1024 })
    ).toBeNull();
  });

  it('rejects unsupported extensions', () => {
    expect(validateFile({ name: 'notes.txt', size: 10 })).toBe(
      'Only .stl and .ply files are supported.'
    );
  });

  it('rejects files larger than 200 MB', () => {
    expect(
      validateFile({
        name: 'huge.stl',
        size: 200 * 1024 * 1024 + 1,
      })
    ).toBe('File size must be under 200 MB.');
  });
});
