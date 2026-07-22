import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.fn();
const apiUrlMock = vi.fn((path) => `http://api.test${path}`);

vi.mock('../client', () => ({
  request: (...args) => requestMock(...args),
  apiUrl: (...args) => apiUrlMock(...args),
}));

vi.mock('../../config/env', () => ({
  API_BASE_URL: 'http://api.test',
  USE_LOCAL_DEV_PIPELINE: false,
}));

const { buildResumeFormData, resumeRun, getRun, fetchRunFile, createRun } =
  await import('../runs');

const formKeys = (formData) => [...formData.keys()];

describe('buildResumeFormData', () => {
  it('always includes from_step as a string', () => {
    const formData = buildResumeFormData({ fromStep: 4 });
    expect(formData.get('from_step')).toBe('4');
    expect(formKeys(formData)).toEqual(['from_step']);
  });

  it('appends optional jaw and attachment files when provided', () => {
    const maxilla = new File(['m'], 'max.stl', { type: 'model/stl' });
    const mandible = new File(['n'], 'mand.stl', { type: 'model/stl' });
    const file = new File(['a'], 'wall.stl', { type: 'model/stl' });

    const formData = buildResumeFormData({
      fromStep: 2,
      maxilla,
      mandible,
      file,
    });

    expect(formData.get('from_step')).toBe('2');
    expect(formData.get('maxilla')).toBe(maxilla);
    expect(formData.get('mandible')).toBe(mandible);
    expect(formData.get('file')).toBe(file);
  });

  it('omits empty optional file fields', () => {
    const formData = buildResumeFormData({ fromStep: 7 });
    expect(formData.has('maxilla')).toBe(false);
    expect(formData.has('mandible')).toBe(false);
    expect(formData.has('file')).toBe(false);
  });

  it('appends dynamic parameter entries with exact backend keys', () => {
    const formData = buildResumeFormData({
      fromStep: 4,
      parameters: {
        trim_offset: '0.35',
        depth_mm: '4.5',
      },
    });

    expect(formData.get('from_step')).toBe('4');
    expect(formData.get('trim_offset')).toBe('0.35');
    expect(formData.get('depth_mm')).toBe('4.5');
  });
});

describe('resumeRun', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects missing runId or fromStep before calling the API', async () => {
    await expect(resumeRun(null, { fromStep: 2 })).rejects.toThrow(
      'runId is required to resume a run.'
    );
    await expect(resumeRun('run-1', {})).rejects.toThrow(
      'from_step is required to resume a run.'
    );
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('posts FormData and normalizes the response shape', async () => {
    requestMock.mockResolvedValue({
      run_id: 'new-run',
      status_url: '/runs/new-run',
    });

    const result = await resumeRun('run-1', {
      fromStep: 4,
      parameters: { trim_offset: '0.35' },
    });

    expect(result).toEqual({
      runId: 'new-run',
      statusUrl: '/runs/new-run',
    });

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [path, options] = requestMock.mock.calls[0];
    expect(path).toBe('/runs/run-1/resume');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get('from_step')).toBe('4');
    expect(options.body.get('trim_offset')).toBe('0.35');
  });
});

describe('getRun', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('forwards run id and options to request', async () => {
    const signal = AbortSignal.abort();
    requestMock.mockResolvedValue({ status: 'running', files: [] });

    await getRun('abc', { signal });

    expect(requestMock).toHaveBeenCalledWith('/runs/abc', { signal });
  });
});

describe('fetchRunFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns a blob for a successful download', async () => {
    const blob = new Blob(['mesh'], { type: 'model/stl' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => blob,
      })
    );

    await expect(fetchRunFile('/runs/r1/files/a.stl')).resolves.toBe(blob);
    expect(apiUrlMock).toHaveBeenCalledWith('/runs/r1/files/a.stl');
    expect(fetch).toHaveBeenCalledWith('http://api.test/runs/r1/files/a.stl');
  });

  it('throws when the download fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
    );

    await expect(fetchRunFile('/missing.stl')).rejects.toThrow(
      'Failed to download file: /missing.stl (404)'
    );
  });
});

describe('createRun (production path)', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('posts maxilla/mandible scans with patient metadata', async () => {
    const maxilla = new File(['x'], 'max.stl');
    const mandible = new File(['y'], 'mand.stl');
    requestMock.mockResolvedValue({ run_id: 'run-9' });

    await createRun({
      maxilla,
      mandible,
      patientId: 'P-1',
      stentraType: 'lat_left',
    });

    const [path, options] = requestMock.mock.calls[0];
    expect(path).toBe('/runs');
    expect(options.method).toBe('POST');
    expect(options.body.get('maxilla')).toBe(maxilla);
    expect(options.body.get('mandible')).toBe(mandible);
    expect(options.body.get('patient_id')).toBe('P-1');
    expect(options.body.get('stentra_type')).toBe('lat_left');
    expect(options.body.has('reoriented_maxilla')).toBe(false);
  });
});
