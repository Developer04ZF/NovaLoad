/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import express, { type Router } from 'express';

function buildDeterministicBuffer(seedName: string, sizeBytes: number): Buffer {
  const chunk = crypto.createHash('sha256').update(seedName).digest();
  const out = Buffer.allocUnsafe(sizeBytes);
  for (let offset = 0; offset < sizeBytes; offset += chunk.length) {
    chunk.copy(out, offset, 0, Math.min(chunk.length, sizeBytes - offset));
  }
  return out;
}

export function createFixtureRouter(): Router {
  const router = express.Router();

  const CATALOG: Record<string, { size: number; mime: string; throttleMs: number }> = {
    'novaload-linux-x64.tar.gz': { size: 512 * 1024, mime: 'application/gzip', throttleMs: 12 },
    'ubuntu-server-notes.pdf': { size: 192 * 1024, mime: 'application/pdf', throttleMs: 8 },
    'dataset-telemetry-2026.zip': { size: 768 * 1024, mime: 'application/zip', throttleMs: 15 },
    'release-checksums.txt': { size: 16 * 1024, mime: 'text/plain', throttleMs: 0 },
    'sample-fast.bin': { size: 256 * 1024, mime: 'application/octet-stream', throttleMs: 0 },
    'sample-slow.bin': { size: 384 * 1024, mime: 'application/octet-stream', throttleMs: 30 },
  };

  async function streamRangeOrFull(
    req: express.Request,
    res: express.Response,
    buf: Buffer,
    filename: string,
    mime: string,
    supportsRange: boolean,
    throttleMs: number
  ) {
    const etag = `"${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16)}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Accept-Ranges', supportsRange ? 'bytes' : 'none');

    if (req.method === 'HEAD') {
      res.setHeader('Content-Length', String(buf.length));
      return res.status(200).end();
    }

    const rangeHeader = req.headers.range;
    if (supportsRange && rangeHeader && rangeHeader.startsWith('bytes=')) {
      const [rawStart, rawEnd] = rangeHeader.replace('bytes=', '').split('-');
      const start = Number(rawStart || 0);
      const end = rawEnd ? Math.min(buf.length - 1, Number(rawEnd)) : buf.length - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= buf.length) {
        res.setHeader('Content-Range', `bytes */${buf.length}`);
        return res.status(416).end();
      }
      const slice = buf.subarray(start, end + 1);
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${buf.length}`);
      res.setHeader('Content-Length', String(slice.length));
      await writeChunked(res, slice, throttleMs);
      return res.end();
    }

    res.status(200);
    res.setHeader('Content-Length', String(buf.length));
    await writeChunked(res, buf, throttleMs);
    return res.end();
  }

  async function writeChunked(res: express.Response, buf: Buffer, throttleMs: number) {
    const chunkSize = 16 * 1024;
    for (let offset = 0; offset < buf.length; offset += chunkSize) {
      if (res.destroyed || res.writableEnded) break;
      const piece = buf.subarray(offset, Math.min(buf.length, offset + chunkSize));
      res.write(piece);
      if (throttleMs > 0) {
        await new Promise((r) => setTimeout(r, throttleMs));
      }
    }
  }

  router.all('/file/:name', async (req, res) => {
    const name = String(req.params.name || 'sample-fast.bin');
    const entry = CATALOG[name] || { size: 256 * 1024, mime: 'application/octet-stream', throttleMs: 6 };
    const size = Number(req.query.size) > 0 ? Math.min(4 * 1024 * 1024, Number(req.query.size)) : entry.size;
    const throttle = req.query.throttle !== undefined ? Number(req.query.throttle) : entry.throttleMs;
    const buf = buildDeterministicBuffer(name, size);
    await streamRangeOrFull(req, res, buf, name, entry.mime, true, throttle);
  });

  router.all('/no-range/:name', async (req, res) => {
    const name = String(req.params.name || 'legacy-stream.bin');
    const size = Number(req.query.size) > 0 ? Math.min(2 * 1024 * 1024, Number(req.query.size)) : 128 * 1024;
    const buf = buildDeterministicBuffer(`norange:${name}`, size);
    await streamRangeOrFull(req, res, buf, name, 'application/octet-stream', false, 0);
  });

  router.all('/redirect/:name', (req, res) => {
    const name = String(req.params.name || 'sample-fast.bin');
    res.redirect(302, `/api/fixtures/file/${encodeURIComponent(name)}`);
  });

  router.all('/video/:name', async (req, res) => {
    const rawName = String(req.params.name || 'novaload-overview.mp4');
    const quality = String(req.query.quality || '1080p');
    const isAudio = quality === 'audio';
    const base = rawName.replace(/\.(mp4|mp3|webm)$/i, '');
    const outName = isAudio ? `${base}.mp3` : `${base}-${quality}.mp4`;
    const size = isAudio ? 140 * 1024 : quality === '720p' ? 320 * 1024 : 580 * 1024;
    const mime = isAudio ? 'audio/mpeg' : 'video/mp4';
    const buf = buildDeterministicBuffer(`media:${outName}`, size);
    await streamRangeOrFull(req, res, buf, outName, mime, true, 10);
  });

  router.get('/checksum/:name', (req, res) => {
    const name = String(req.params.name || 'sample-fast.bin');
    const entry = CATALOG[name] || { size: 256 * 1024, mime: 'application/octet-stream', throttleMs: 6 };
    const size = Number(req.query.size) > 0 ? Math.min(4 * 1024 * 1024, Number(req.query.size)) : entry.size;
    const buf = buildDeterministicBuffer(name, size);
    res.json({
      filename: name,
      size,
      sha256: crypto.createHash('sha256').update(buf).digest('hex'),
      sha512: crypto.createHash('sha512').update(buf).digest('hex'),
    });
  });

  return router;
}
