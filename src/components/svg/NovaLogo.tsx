/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export const NovaLogoMark: React.FC<LogoProps> = ({ size = 28, animated = false, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect
      x="2"
      y="2"
      width="36"
      height="36"
      rx="9"
      className="fill-blue-600 dark:fill-blue-500"
    />
    <path
      d="M20 7.5C26.9036 7.5 32.5 13.0964 32.5 20C32.5 26.9036 26.9036 32.5 20 32.5C13.0964 32.5 7.5 26.9036 7.5 20"
      stroke="white"
      strokeOpacity="0.32"
      strokeWidth="2.2"
      strokeLinecap="round"
      className={animated ? 'animate-nl-flow' : ''}
    />
    <path
      d="M20 10.5V24.5M20 24.5L14.25 18.75M20 24.5L25.75 18.75"
      stroke="white"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13 28.5H27"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
);

export const NovaLoadingMark: React.FC<{ size?: number; label?: string }> = ({
  size = 44,
  label = 'Loading NovaLoad',
}) => (
  <div className="inline-flex flex-col items-center gap-3" role="status" aria-label={label}>
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="24"
        cy="24"
        r="20"
        className="stroke-slate-200 dark:stroke-slate-800"
        strokeWidth="3"
      />
      <circle
        cx="24"
        cy="24"
        r="20"
        className="stroke-blue-600 dark:stroke-blue-400 animate-nl-flow"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M24 14V28M24 28L18.5 22.5M24 28L29.5 22.5"
        className="stroke-slate-900 dark:stroke-slate-100"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 33H31"
        className="stroke-blue-600 dark:stroke-blue-400"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  </div>
);
