import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiUrl, request } from '../client';

vi.mock('../../config/env', () => ({
  API_BASE_URL: 'http://api.test',
  USE_LOCAL_DEV_PIPELINE: false,
}));

describe('apiUrl', () => {
  it('joins the configured base URL with a relative path', () => {
    expect(apiUrl('/runs')).toBe('http://api.test/runs');
    expect(apiUrl('/runs/abc')).toBe('http://api.test/runs/abc');
  });
});

describe('request', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on success', async () => {
    const payload = { run_id: 'r1', status: 'queued' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => payload,
      })
    );

    await expect(request('/runs')).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith('http://api.test/runs', {});
  });

  it('throws a status error when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      })
    );

    await expect(request('/runs')).rejects.toThrow(
      'Request failed with status 500'
    );
  });
});
