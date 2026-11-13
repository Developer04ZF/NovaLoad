/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Search, BookOpen } from 'lucide-react';

interface DocSection {
  id: string;
  group: string;
  title: string;
  body: string[];
}

const DOC_SECTIONS: DocSection[] = [
  {
    id: 'intro',
    group: 'Project',
    title: 'Introduction & Product Vision',
    body: [
      'NovaLoad is an open-source, cross-platform desktop download manager built to combine multi-connection transfer acceleration, persistent segmented pause/resume, queue scheduling, media stream inspection, browser integration, and optional Gemini AI file management.',
      'Tagline: Download smarter. Manage everything. Licensed under Apache License 2.0.',
    ],
  },
  {
    id: 'engine',
    group: 'Download Engine',
    title: 'Multi-Connection HTTP/HTTPS & Range Fallback',
    body: [
      'Every download begins with a metadata probe (HEAD, falling back to GET Range: bytes=0-0 if HEAD returns 405/501). Redirects are validated at every hop against SSRF rules.',
      'When the origin server advertises Accept-Ranges: bytes and Content-Length >= 64 KB, NovaLoad divides the transfer into N configurable byte-range segments (1–16) and writes each chunk directly to its byte offset inside a .part file using bounded streaming buffers.',
      'If a server does not support Range requests or returns HTTP 200 instead of 206, NovaLoad safely falls back to a single-stream sequential download without corrupting data.',
    ],
  },
  {
    id: 'integrity',
    group: 'Download Engine',
    title: 'Pause, Resume, Retry & SHA Verification',
    body: [
      'Segment byte offsets, ETag headers, and status checkpoints are persisted in SQLite. Pausing aborts active HTTP streams cleanly and flushes file handles so resuming continues from exact byte offsets.',
      'Upon completion, NovaLoad streams the finished file through SHA-256 and SHA-512 hashers, checks total byte size, compares optional expected checksums, and renames the .part file atomically.',
    ],
  },
  {
    id: 'queues',
    group: 'User Guide',
    title: 'Queues, Categories & Scheduler',
    body: [
      'Queues control maximum concurrent downloads, per-download connection limits, and optional queue bandwidth caps. Drag-and-drop or arrow buttons reorder priorities.',
      'Categories automatically route finished files into subfolders (/Software, /Archives, /Documents, /Video, /Audio, /Images) by extension.',
      'The Scheduler executes timed rules (start queue, pause queue, or adjust global speed limit) on selected days of the week.',
    ],
  },
  {
    id: 'media',
    group: 'User Guide',
    title: 'Video & Open Media Downloader',
    body: [
      'NovaLoad inspects direct media URLs (MP4, WebM, MP3, WAV) and open HLS (.m3u8) playlists to present available resolutions, codecs, and audio-only tracks.',
      'NovaLoad respects platform terms and does not bypass DRM, encrypted streams, or gated authentication walls.',
    ],
  },
  {
    id: 'ai',
    group: 'AI & Security',
    title: 'Gemini AI Assistant & Preview-Confirm Workflow',
    body: [
      'Gemini AI is strictly optional and never required for downloading. All Gemini API calls execute server-side via @google/genai using GEMINI_API_KEY from environment secrets.',
      'By default, only sanitized file metadata (filenames, relative paths, sizes, SHA-256 prefixes) is analyzed. Every suggested move, rename, or duplicate cleanup is presented in a Preview & Confirm table and only runs after explicit approval.',
    ],
  },
  {
    id: 'browser',
    group: 'Integrations',
    title: 'Chrome, Edge & Firefox Browser Bridge',
    body: [
      'Extension sources live under extensions/chrome-edge and extensions/firefox using Manifest V3 with minimal permissions (downloads, contextMenus, storage).',
      'Every handoff request to /api/bridge/capture is validated with a rotatable x-novaload-token header and URL SSRF validation.',
    ],
  },
  {
    id: 'security',
    group: 'AI & Security',
    title: 'Security Model & Threat Mitigations',
    body: [
      'SSRF protection blocks private/loopback/metadata IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.169.254, ::1) and non-HTTP/S protocols.',
      'Path traversal containment (resolveSafePath) guarantees file writes, renames, and moves stay strictly inside NovaLoad’s managed downloads directory. Downloaded files are never executed automatically.',
    ],
  },
  {
    id: 'design',
    group: 'UI/UX System',
    title: 'Design System, Themes & RTL Support',
    body: [
      'NovaLoad pairs Plus Jakarta Sans headings, DM Sans UI prose, and JetBrains Mono tabular figures across a synchronized Dark and Light theme system.',
      'Full RTL layout support is built in for Persian (fa) and Arabic (ar), alongside reduced-motion compliance and keyboard navigation.',
    ],
  },
  {
    id: 'releases',
    group: 'Release & CLI',
    title: 'Cross-Platform Packaging, Tauri 2 & CLI',
    body: [
      'The repository includes the full Tauri 2 + Rust workspace under src-tauri/, automated multi-OS GitHub Actions release pipelines (.github/workflows/release.yml) targeting Windows (EXE/MSI/ZIP), Linux (AppImage/DEB/RPM), and macOS (DMG/ZIP), plus a companion CLI under cli/.',
    ],
  },
];

export const DocsView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(DOC_SECTIONS[0].id);

  const filtered = useMemo(() => {
    if (!query.trim()) return DOC_SECTIONS;
    const q = query.toLowerCase();
    return DOC_SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q) ||
        s.body.some((p) => p.toLowerCase().includes(q))
    );
  }, [query]);

  const activeSection = filtered.find((s) => s.id === activeId) || filtered[0] || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Documentation Knowledge Base</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Synchronized engineering, user, security, and release documentation (see also docs/ in the repository).
          </p>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation..."
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121722] w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <nav className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-3 space-y-1 h-fit">
          {filtered.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveId(sec.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                activeSection?.id === sec.id
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="text-[10px] text-slate-400">{sec.group}</div>
              <div>{sec.title}</div>
            </button>
          ))}
        </nav>

        <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-6">
          {activeSection ? (
            <article className="space-y-4 max-w-3xl">
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                <BookOpen className="w-4 h-4" />
                <span>{activeSection.group}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{activeSection.title}</h2>
              <div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {activeSection.body.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </article>
          ) : (
            <p className="text-xs text-slate-500">No matching documentation sections found.</p>
          )}
        </div>
      </div>
    </div>
  );
};
