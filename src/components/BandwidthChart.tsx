/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { BandwidthPoint } from '../shared/types';
import { formatSpeed } from '../lib/format';

interface BandwidthChartProps {
  points: BandwidthPoint[];
  peakSpeedBps: number;
}

export const BandwidthChart: React.FC<BandwidthChartProps> = ({ points, peakSpeedBps }) => {
  const width = 640;
  const height = 176;
  const padX = 12;
  const padY = 16;

  const series = points.length >= 2 ? points : [{ timestamp: Date.now() - 1000, speedBps: 0, activeCount: 0 }, { timestamp: Date.now(), speedBps: 0, activeCount: 0 }];
  const maxVal = Math.max(1024 * 64, peakSpeedBps, ...series.map((p) => p.speedBps));

  const coords = series.map((pt, idx) => {
    const x = padX + (idx / Math.max(1, series.length - 1)) * (width - padX * 2);
    const y = height - padY - (pt.speedBps / maxVal) * (height - padY * 2);
    return { x, y, speed: pt.speedBps };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height - padY} L ${coords[0].x.toFixed(1)} ${height - padY} Z`;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
        <span>Real-time throughput (last 60s)</span>
        <span className="font-mono tabular-nums">Scale max: {formatSpeed(maxVal)}</span>
      </div>
      <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D1119] p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40 block" role="img" aria-label="Real-time bandwidth chart">
          <defs>
            <linearGradient id="nlBwGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((ratio) => {
            const y = padY + ratio * (height - padY * 2);
            return (
              <line
                key={ratio}
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            );
          })}

          <path d={areaPath} fill="url(#nlBwGrad)" />
          <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

          {coords.length > 0 && (
            <circle
              cx={coords[coords.length - 1].x}
              cy={coords[coords.length - 1].y}
              r="3.5"
              className="fill-blue-600 dark:fill-blue-400"
            />
          )}
        </svg>
      </div>
    </div>
  );
};
