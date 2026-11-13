/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type NoviExpression =
  | 'idle'
  | 'happy'
  | 'working'
  | 'downloading'
  | 'success'
  | 'warning'
  | 'error';

interface NoviProps {
  expression?: NoviExpression;
  size?: number;
  className?: string;
}

export const NoviMascot: React.FC<NoviProps> = ({
  expression = 'idle',
  size = 96,
  className = '',
}) => {
  const accentColor =
    expression === 'success'
      ? '#16A34A'
      : expression === 'warning'
        ? '#D97706'
        : expression === 'error'
          ? '#DC2626'
          : '#2563EB';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${expression === 'idle' || expression === 'downloading' ? 'animate-nl-float' : ''} ${className}`}
      role="img"
      aria-label={`Novi assistant mascot (${expression})`}
    >
      {/* Subtle ground shadow */}
      <ellipse cx="60" cy="108" rx="28" ry="5" className="fill-slate-900/10 dark:fill-black/35" />

      {/* Top antenna */}
      <line x1="60" y1="14" x2="60" y2="26" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="12" r="4.5" fill={accentColor} />

      {/* Side aerodynamic fins */}
      <path
        d="M23 50L12 58V72L23 68V50Z"
        className="fill-slate-200 dark:fill-slate-700 stroke-slate-300 dark:stroke-slate-600"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M97 50L108 58V72L97 68V50Z"
        className="fill-slate-200 dark:fill-slate-700 stroke-slate-300 dark:stroke-slate-600"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Chassis */}
      <rect
        x="24"
        y="26"
        width="72"
        height="64"
        rx="18"
        className="fill-white dark:fill-[#161D2B] stroke-slate-300 dark:stroke-slate-700"
        strokeWidth="2.5"
      />

      {/* Visor screen */}
      <rect
        x="33"
        y="37"
        width="54"
        height="34"
        rx="10"
        className="fill-slate-900 dark:fill-[#090D14]"
      />

      {/* Facial expressions */}
      {expression === 'idle' && (
        <>
          <circle cx="47" cy="53" r="4" fill="#60A5FA" />
          <circle cx="73" cy="53" r="4" fill="#60A5FA" />
          <path d="M54 61H66" stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}

      {expression === 'happy' && (
        <>
          <path d="M42 54C44 50 50 50 52 54" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
          <path d="M68 54C70 50 76 50 78 54" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
          <path d="M52 60C55 64 65 64 68 60" stroke="#60A5FA" strokeWidth="2.6" strokeLinecap="round" />
        </>
      )}

      {expression === 'working' && (
        <>
          <rect x="42" y="51" width="10" height="4" rx="2" fill="#60A5FA" />
          <rect x="68" y="51" width="10" height="4" rx="2" fill="#60A5FA" />
          <path d="M50 61H70" stroke="#60A5FA" strokeWidth="2.4" strokeLinecap="round" className="animate-nl-flow" />
        </>
      )}

      {expression === 'downloading' && (
        <>
          <circle cx="45" cy="50" r="3.2" fill="#60A5FA" />
          <circle cx="75" cy="50" r="3.2" fill="#60A5FA" />
          <path
            d="M60 45V61M60 61L54 55M60 61L66 55"
            stroke="#3B82F6"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {expression === 'success' && (
        <>
          <path d="M43 52C45 49 49 49 51 52" stroke="#4ADE80" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M69 52C71 49 75 49 77 52" stroke="#4ADE80" strokeWidth="2.8" strokeLinecap="round" />
          <path
            d="M53 60L58 64.5L68 55.5"
            stroke="#4ADE80"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {expression === 'warning' && (
        <>
          <circle cx="47" cy="52" r="3.5" fill="#FBBF24" />
          <circle cx="73" cy="52" r="3.5" fill="#FBBF24" />
          <path d="M53 62L60 59L67 62" stroke="#FBBF24" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {expression === 'error' && (
        <>
          <path d="M43 49L51 57M51 49L43 57" stroke="#F87171" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M69 49L77 57M77 49L69 57" stroke="#F87171" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M53 63C56 59 64 59 67 63" stroke="#F87171" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}

      {/* Lower core badge */}
      <rect x="44" y="77" width="32" height="6" rx="3" className="fill-slate-200 dark:fill-slate-700" />
      <rect x="48" y="78.5" width="14" height="3" rx="1.5" fill={accentColor} />

      {/* Bottom thruster ports */}
      <rect x="38" y="90" width="12" height="5" rx="2.5" className="fill-slate-300 dark:fill-slate-700" />
      <rect x="70" y="90" width="12" height="5" rx="2.5" className="fill-slate-300 dark:fill-slate-700" />
    </svg>
  );
};
