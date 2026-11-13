/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import net from 'node:net';
import path from 'node:path';

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  reason?: string;
}

const PRIVATE_IPV4_CIDR = [
  /^10\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./,
];

export function isPrivateOrReservedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    lower === 'localhost' ||
    lower === 'localhost.localdomain' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower === 'metadata.google.internal'
  ) {
    return true;
  }

  const ipVersion = net.isIP(lower);
  if (ipVersion === 4) {
    return PRIVATE_IPV4_CIDR.some((rx) => rx.test(lower));
  }
  if (ipVersion === 6) {
    return (
      lower === '::1' ||
      lower === '::' ||
      lower.startsWith('fe80:') ||
      lower.startsWith('fc') ||
      lower.startsWith('fd')
    );
  }
  return false;
}

export function validateDownloadUrl(
  rawUrl: string,
  options: { blockPrivateIps: boolean; allowLocalFixturesPort?: number } = {
    blockPrivateIps: true,
  }
): UrlValidationResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, reason: 'URL cannot be empty.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Malformed URL syntax.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      reason: `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are allowed.`,
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      reason: 'Embedded credentials in URLs are blocked for security.',
    };
  }

  const isLocalFixture =
    options.allowLocalFixturesPort !== undefined &&
    (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') &&
    Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80)) ===
      options.allowLocalFixturesPort &&
    parsed.pathname.startsWith('/api/fixtures/');

  if (options.blockPrivateIps && !isLocalFixture && isPrivateOrReservedHost(parsed.hostname)) {
    return {
      valid: false,
      reason: `Blocked private or reserved network host "${parsed.hostname}" (SSRF protection).`,
    };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}

export function sanitizeFilename(rawName: string): string {
  const base = path.basename(rawName.trim().replace(/\\/g, '/'));
  const cleaned = base
    .replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, '_')
    .replace(/^\.+$/, 'download')
    .trim();

  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return `novaload_${Date.now()}.bin`;
  }
  return cleaned.slice(0, 200);
}

/**
 * Resolves a relative or requested path strictly inside baseDir.
 * Throws if path traversal is attempted.
 */
export function resolveSafePath(baseDir: string, targetPath: string): string {
  const resolvedBase = path.resolve(baseDir);
  const candidate = path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(resolvedBase, targetPath);

  const relative = path.relative(resolvedBase, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path traversal rejected: "${targetPath}" escapes "${resolvedBase}".`);
  }
  return candidate;
}

export function generateBridgeToken(): string {
  return `nl_bridge_${crypto.randomBytes(18).toString('hex')}`;
}

export function redactSecrets(input: string): string {
  return input
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/nl_bridge_[0-9a-f]{12,}/gi, '[REDACTED_BRIDGE_TOKEN]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
}
