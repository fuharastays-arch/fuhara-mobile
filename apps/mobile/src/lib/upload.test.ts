import { createUploadId } from './upload-id';

describe('createUploadId', () => {
  it('creates a storage-policy-compatible UUID v4 path segment', () => {
    expect(createUploadId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('does not reuse the same path segment', () => {
    expect(createUploadId()).not.toBe(createUploadId());
  });
});
