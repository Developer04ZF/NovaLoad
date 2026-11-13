/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import type { AiProposedAction, DuplicateGroup, FileInventoryItem } from '../../src/shared/types.ts';
import { NovaDatabase } from '../db.ts';
import { resolveSafePath, sanitizeFilename } from '../security.ts';

export class FileManagerService {
  private readonly db: NovaDatabase;

  constructor(db: NovaDatabase) {
    this.db = db;
  }

  private async hashFileSha256(absPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const h = crypto.createHash('sha256');
      const stream = fs.createReadStream(absPath);
      stream.on('data', (chunk) => h.update(chunk));
      stream.on('end', () => resolve(h.digest('hex')));
      stream.on('error', reject);
    });
  }

  public async scanDownloadsDirectory(): Promise<FileInventoryItem[]> {
    const root = this.db.downloadsDir;
    const results: FileInventoryItem[] = [];

    const walk = async (dir: string): Promise<void> => {
      const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
          continue;
        }
        if (entry.name.endsWith('.part') || entry.name.startsWith('.')) continue;

        const stat = await fsp.stat(full);
        const rel = path.relative(root, full).replace(/\\/g, '/');
        const ext = path.extname(entry.name).replace(/^\./, '').toLowerCase();
        const sha256 = await this.hashFileSha256(full);
        const topFolder = rel.includes('/') ? rel.split('/')[0] : 'Uncategorized';

        results.push({
          id: crypto.createHash('md5').update(rel).digest('hex').slice(0, 12),
          filename: entry.name,
          relativePath: rel,
          absolutePath: full,
          category: topFolder,
          sizeBytes: stat.size,
          extension: ext || 'bin',
          sha256,
          modifiedAt: stat.mtime.toISOString(),
        });
      }
    };

    await walk(root);
    return results.sort((a, b) => b.sizeBytes - a.sizeBytes);
  }

  public async findDuplicates(): Promise<DuplicateGroup[]> {
    const items = await this.scanDownloadsDirectory();
    const byHash = new Map<string, FileInventoryItem[]>();
    for (const item of items) {
      const list = byHash.get(item.sha256) || [];
      list.push(item);
      byHash.set(item.sha256, list);
    }

    const groups: DuplicateGroup[] = [];
    for (const [sha256, files] of byHash.entries()) {
      if (files.length > 1) {
        groups.push({
          sha256,
          sizeBytes: files[0].sizeBytes,
          files,
        });
      }
    }
    return groups;
  }

  public async executeApprovedActions(
    actions: AiProposedAction[]
  ): Promise<{ succeeded: number; failed: Array<{ id: string; error: string }> }> {
    const root = this.db.downloadsDir;
    let succeeded = 0;
    const failed: Array<{ id: string; error: string }> = [];

    for (const action of actions) {
      try {
        if (action.type === 'create_folder') {
          const targetDir = resolveSafePath(root, action.targetPath || action.sourcePath);
          await fsp.mkdir(targetDir, { recursive: true });
          succeeded++;
          continue;
        }

        const safeSrc = resolveSafePath(root, action.sourcePath);
        if (!fs.existsSync(safeSrc)) {
          throw new Error(`Source file not found: ${action.sourcePath}`);
        }

        if (action.type === 'delete_duplicate') {
          await fsp.unlink(safeSrc);
          succeeded++;
          continue;
        }

        if (action.type === 'move' || action.type === 'rename') {
          if (!action.targetPath) {
            throw new Error('Target path is required for move/rename.');
          }
          const parsedTarget =
            action.type === 'rename'
              ? path.join(path.dirname(action.sourcePath), sanitizeFilename(path.basename(action.targetPath)))
              : action.targetPath;
          const safeDest = resolveSafePath(root, parsedTarget);

          if (fs.existsSync(safeDest)) {
            throw new Error(`Conflict detected: "${action.targetPath}" already exists (refusing silent overwrite).`);
          }

          await fsp.mkdir(path.dirname(safeDest), { recursive: true });
          await fsp.rename(safeSrc, safeDest);
          succeeded++;
        }
      } catch (err) {
        failed.push({ id: action.id, error: (err as Error).message });
      }
    }

    return { succeeded, failed };
  }
}
