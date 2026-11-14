/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs';
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
  /^192\.0\.0\./,
  /^192\.0\.2\./,
  /^198\.(1[89])\./,
  /^198\.51\.100\./,
  /^203\.0\.113\./,
  /^22[4-9]\./,
  /^23\d\./,
  /^2[45]\d\./,
];

function extractMappedIpv4FromIpv6(ipLower: string): string | null {
  if (!ipLower.startsWith('::ffff:')) return null;
  const suffix = ipLower.slice('::ffff:'.length);
  if (net.isIP(suffix) === 4) {
    return suffix;
  }
  const hexMatch = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(suffix);
  if (!hexMatch) return null;
  const hi = parseInt(hexMatch[1], 16);
  const lo = parseInt(hexMatch[2], 16);
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

export function isPrivateOrReservedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  if (
    lower === 'localhost' ||
    lower === 'localhost.localdomain' ||
    lower.endsWith('.localhost') ||
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
    const mappedIpv4 = extractMappedIpv4FromIpv6(lower);
    if (mappedIpv4) {
      return PRIVATE_IPV4_CIDR.some((rx) => rx.test(mappedIpv4));
    }
    return (
      lower === '::1' ||
      lower === '::' ||
      lower.startsWith('fe80:') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb') ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('ff')
    );
  }
  return false;
}

export type DnsLookupFn = (hostname: string) => Promise<Array<{ address: string; family: number }>>;

const defaultDnsLookup: DnsLookupFn = async (hostname: string) => {
  return dns.lookup(hostname, { all: true });
};

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

export async function validateDownloadUrlWithDns(
  rawUrl: string,
  options: {
    blockPrivateIps: boolean;
    allowLocalFixturesPort?: number;
    lookupFn?: DnsLookupFn;
  } = { blockPrivateIps: true }
): Promise<UrlValidationResult> {
  const syncResult = validateDownloadUrl(rawUrl, options);
  if (!syncResult.valid || !syncResult.normalizedUrl) {
    return syncResult;
  }

  if (!options.blockPrivateIps) {
    return syncResult;
  }

  const parsed = new URL(syncResult.normalizedUrl);
  const isLocalFixture =
    options.allowLocalFixturesPort !== undefined &&
    (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') &&
    Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80)) ===
      options.allowLocalFixturesPort &&
    parsed.pathname.startsWith('/api/fixtures/');

  if (isLocalFixture) {
    return syncResult;
  }

  const bareHost = parsed.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(bareHost) !== 0) {
    return syncResult;
  }

  const lookup = options.lookupFn || defaultDnsLookup;
  try {
    const records = await lookup(bareHost);
    for (const record of records) {
      if (isPrivateOrReservedHost(record.address)) {
        return {
          valid: false,
          reason: `Blocked DNS resolution for "${bareHost}" -> private/reserved IP ${record.address} (SSRF protection).`,
        };
      }
    }
  } catch (err) {
    // Allow callers doing offline unit tests with no external DNS if lookup throws ENOTFOUND?
    // When making a real request, DNS failure is also fatal, so return clear network error:
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
      return {
        valid: false,
        reason: `DNS lookup failed for "${bareHost}" (${code}).`,
      };
    }
    throw err;
  }

  return syncResult;
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

/**
 * Resolves a path strictly inside baseDir AND verifies no symlink ancestor escapes baseDir.
 */
export function resolveSafeRealPath(baseDir: string, targetPath: string): string {
  const candidate = resolveSafePath(baseDir, targetPath);
  const resolvedBase = path.resolve(baseDir);
  const realBase = fs.existsSync(resolvedBase) ? fs.realpathSync(resolvedBase) : resolvedBase;

  if (fs.existsSync(candidate)) {
    const stat = fs.lstatSync(candidate);
    if (stat.isSymbolicLink()) {
      const realTarget = fs.realpathSync(candidate);
      const rel = path.relative(realBase, realTarget);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error(`Symlink escape rejected: "${targetPath}" points outside "${realBase}".`);
      }
    }
  }

  let cursor = candidate;
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }

  if (fs.existsSync(cursor)) {
    const realAncestor = fs.realpathSync(cursor);
    const rel = path.relative(realBase, realAncestor);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`Symlink traversal rejected: "${targetPath}" escapes "${realBase}".`);
    }
  }

  return candidate;
}

export function generateBridgeToken(): string {
  return `nl_bridge_${crypto.randomBytes(18).toString('hex')}`;
}

export function generateLocalSessionToken(): string {
  return `nl_local_${crypto.randomBytes(24).toString('hex')}`;
}

export function redactSecrets(input: string): string {
  return input
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/nl_bridge_[0-9a-f]{12,}/gi, '[REDACTED_BRIDGE_TOKEN]')
    .replace(/nl_local_[0-9a-f]{12,}/gi, '[REDACTED_LOCAL_TOKEN]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
}
