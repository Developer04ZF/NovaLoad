/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type IllustrationScene =
  | 'empty-dashboard'
  | 'no-downloads'
  | 'empty-search'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'downloading'
  | 'network-error'
  | 'offline'
  | 'video-downloader'
  | 'browser-integration'
  | 'ai-assistant'
  | 'file-organization'
  | 'storage-management'
  | 'updates'
  | 'first-launch';

export const NovaIllustration: React.FC<{
  scene: IllustrationScene;
  width?: number;
  height?: number;
  className?: string;
}> = ({ scene, width = 180, height = 120, className = '' }) => {
  const accent =
    scene === 'completed'
      ? '#16A34A'
      : scene === 'failed' || scene === 'network-error'
        ? '#DC2626'
        : scene === 'paused' || scene === 'offline'
          ? '#D97706'
          : '#2563EB';

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 180 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Architectural blueprint base */}
      <rect
        x="16"
        y="14"
        width="148"
        height="92"
        rx="12"
        className="fill-slate-100/80 dark:fill-slate-800/40 stroke-slate-200 dark:stroke-slate-700/80"
        strokeWidth="1.5"
      />
      <line x1="16" y1="32" x2="164" y2="32" className="stroke-slate-200 dark:stroke-slate-700/80" strokeWidth="1.5" />
      <circle cx="28" cy="23" r="2.5" className="fill-slate-300 dark:fill-slate-600" />
      <circle cx="37" cy="23" r="2.5" className="fill-slate-300 dark:fill-slate-600" />
      <circle cx="46" cy="23" r="2.5" className="fill-slate-300 dark:fill-slate-600" />

      {scene === 'empty-dashboard' || scene === 'no-downloads' ? (
        <>
          <rect x="34" y="46" width="112" height="14" rx="4" className="fill-white dark:fill-slate-900 stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" />
          <rect x="42" y="51" width="46" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" />
          <rect x="34" y="68" width="112" height="14" rx="4" className="fill-white dark:fill-slate-900 stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" />
          <circle cx="136" cy="75" r="10" fill={accent} fillOpacity="0.14" stroke={accent} strokeWidth="1.5" />
          <path d="M136 70V80M136 80L132.5 76.5M136 80L139.5 76.5" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : scene === 'empty-search' ? (
        <>
          <circle cx="82" cy="64" r="18" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" />
          <line x1="95" y1="77" x2="109" y2="91" stroke={accent} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M76 64H88" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : scene === 'completed' ? (
        <>
          <circle cx="90" cy="68" r="22" fill={accent} fillOpacity="0.14" stroke={accent} strokeWidth="2" />
          <path d="M80 68L87 75L101 61" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : scene === 'failed' || scene === 'network-error' || scene === 'offline' ? (
        <>
          <circle cx="90" cy="68" r="22" fill={accent} fillOpacity="0.14" stroke={accent} strokeWidth="2" />
          <path d="M90 57V71" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          <circle cx="90" cy="78" r="2" fill={accent} />
        </>
      ) : scene === 'paused' ? (
        <>
          <circle cx="90" cy="68" r="22" fill={accent} fillOpacity="0.14" stroke={accent} strokeWidth="2" />
          <rect x="83" y="59" width="4.5" height="18" rx="1.5" fill={accent} />
          <rect x="92.5" y="59" width="4.5" height="18" rx="1.5" fill={accent} />
        </>
      ) : scene === 'downloading' ? (
        <>
          <rect x="34" y="54" width="112" height="10" rx="5" className="fill-slate-200 dark:fill-slate-700" />
          <rect x="34" y="54" width="74" height="10" rx="5" fill={accent} />
          <path d="M40 76H62M70 76H96M104 76H140" stroke={accent} strokeWidth="3" strokeLinecap="round" className="animate-nl-flow" />
        </>
      ) : scene === 'video-downloader' ? (
        <>
          <rect x="44" y="44" width="92" height="50" rx="8" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.8" />
          <path d="M84 59L102 69L84 79V59Z" fill={accent} />
        </>
      ) : scene === 'browser-integration' ? (
        <>
          <rect x="34" y="46" width="52" height="42" rx="6" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
          <rect x="98" y="46" width="48" height="42" rx="6" className="fill-white dark:fill-slate-900" stroke={accent} strokeWidth="1.5" />
          <path d="M86 67H98" stroke={accent} strokeWidth="2.5" strokeLinecap="round" className="animate-nl-flow" />
        </>
      ) : scene === 'ai-assistant' ? (
        <>
          <rect x="44" y="45" width="92" height="48" rx="8" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
          <circle cx="66" cy="69" r="10" fill={accent} fillOpacity="0.16" stroke={accent} strokeWidth="1.8" />
          <path d="M84 62H122M84 70H116M84 78H106" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="2.4" strokeLinecap="round" />
        </>
      ) : scene === 'file-organization' || scene === 'storage-management' ? (
        <>
          <path d="M40 50H72L78 56H140V88H40V50Z" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="52" y="66" width="76" height="6" rx="3" className="fill-slate-200 dark:fill-slate-700" />
          <rect x="52" y="66" width="44" height="6" rx="3" fill={accent} />
        </>
      ) : (
        <>
          {/* updates / first-launch */}
          <path d="M90 46L108 64H97V86H83V64H72L90 46Z" fill={accent} fillOpacity="0.18" stroke={accent} strokeWidth="2" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
};

export const ALL_ILLUSTRATION_SCENES: Array<{ id: IllustrationScene; label: string }> = [
  { id: 'empty-dashboard', label: 'Empty Dashboard' },
  { id: 'no-downloads', label: 'No Downloads' },
  { id: 'empty-search', label: 'Empty Search' },
  { id: 'downloading', label: 'Active Transfer' },
  { id: 'paused', label: 'Paused State' },
  { id: 'completed', label: 'Verified Complete' },
  { id: 'failed', label: 'Transfer Failed' },
  { id: 'network-error', label: 'Network Error' },
  { id: 'offline', label: 'Offline Mode' },
  { id: 'video-downloader', label: 'Media Extractor' },
  { id: 'browser-integration', label: 'Browser Bridge' },
  { id: 'ai-assistant', label: 'AI Organizer' },
  { id: 'file-organization', label: 'File Organization' },
  { id: 'storage-management', label: 'Storage Analytics' },
  { id: 'updates', label: 'Secure Updates' },
  { id: 'first-launch', label: 'First Launch' },
];
