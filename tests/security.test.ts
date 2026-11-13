/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  redactSecrets,
  resolveSafePath,
  sanitizeFilename,
  validateDownloadUrl,
} from '../server/security';

describe('NovaLoad Security Controls', () => {
  it('allows valid HTTPS and HTTP public URLs', () => {
    expect(validateDownloadUrl('https://releases.ubuntu.com/24.04/ubuntu.iso').valid).toBe(true);
    expect(validateDownloadUrl('http://example.org/file.tar.gz').valid).toBe(true);
  });

  it('blocks non-HTTP protocols and embedded credentials', () => {
    expect(validateDownloadUrl('file:///etc/passwd').valid).toBe(false);
    expect(validateDownloadUrl('ftp://example.org/file.bin').valid).toBe(false);
    expect(validateDownloadUrl('https://user:pass@example.org/secret.zip').valid).toBe(false);
  });

  it('blocks private, loopback, and cloud metadata SSRF targets', () => {
    expect(validateDownloadUrl('http://127.0.0.1:8080/admin').valid).toBe(false);
    expect(validateDownloadUrl('http://169.254.169.254/latest/meta-data/').valid).toBe(false);
    expect(validateDownloadUrl('http://10.0.0.5/internal.tar.gz').valid).toBe(false);
    expect(validateDownloadUrl('http://192.168.1.1/router.bin').valid).toBe(false);
    expect(validateDownloadUrl('http://[::1]:3000/').valid).toBe(false);
    expect(validateDownloadUrl('http://localhost/secret').valid).toBe(false);
  });

  it('permits only the explicitly configured local fixture route when allowLocalFixturesPort is set', () => {
    const allowed = validateDownloadUrl('http://127.0.0.1:4567/api/fixtures/file/test.bin', {
      blockPrivateIps: true,
      allowLocalFixturesPort: 4567,
    });
    expect(allowed.valid).toBe(true);

    const blocked = validateDownloadUrl('http://127.0.0.1:4567/api/settings', {
      blockPrivateIps: true,
      allowLocalFixturesPort: 4567,
    });
    expect(blocked.valid).toBe(false);
  });

  it('sanitizes dangerous filenames and rejects path traversal', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFilename('my<file>:name?.zip')).toBe('my_file__name_.zip');

    const base = path.resolve('/tmp/novaload-downloads');
    expect(resolveSafePath(base, 'Archives/release.zip')).toBe(
      path.join(base, 'Archives', 'release.zip')
    );
    expect(() => resolveSafePath(base, '../../etc/shadow')).toThrow(/Path traversal rejected/);
  });

  it('redacts sensitive tokens and API keys from error strings', () => {
    const raw = 'Failed with key AIzaSyD1234567890abcdef1234567890 and nl_bridge_abcdef1234567890';
    const clean = redactSecrets(raw);
    expect(clean).not.toContain('AIzaSyD');
    expect(clean).not.toContain('nl_bridge_abcdef');
  });
});
