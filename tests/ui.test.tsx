/**
 * @vitest-environment jsdom
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import type { DashboardSnapshot } from '../src/shared/types';

const MOCK_SNAPSHOT: DashboardSnapshot = {
  downloads: [],
  queues: [
    {
      id: 'default',
      name: 'Main Queue',
      description: 'Primary queue',
      maxConcurrent: 3,
      maxConnectionsPerDownload: 8,
      speedLimitKbps: null,
      isDefault: true,
      sortOrder: 0,
      activeCount: 0,
      queuedCount: 0,
    },
  ],
  categories: [
    { id: 'archives', name: 'Archives', subfolder: 'Archives', extensions: ['zip'], colorToken: 'amber' },
  ],
  schedules: [],
  settings: {
    theme: 'dark',
    locale: 'en',
    defaultDownloadDir: '/tmp/downloads',
    defaultConnections: 6,
    maxGlobalConcurrent: 4,
    globalSpeedLimitKbps: null,
    clipboardMonitoring: true,
    autoCategorize: true,
    verifyChecksumOnComplete: true,
    autoRetry: true,
    maxRetries: 3,
    notifyOnComplete: true,
    notifyOnError: true,
    minimizeToTray: true,
    launchOnStartup: false,
    browserBridgeEnabled: true,
    browserBridgeToken: 'nl_bridge_testtoken',
    aiEnabled: true,
    aiModel: 'gemini-4-hydrogen',
    aiRequireConfirmation: true,
    aiAllowFileMetadata: true,
    aiAllowFileContent: false,
    releaseChannel: 'stable',
    privacyBlockPrivateIps: true,
  },
  bandwidthHistory: [],
  stats: {
    currentSpeedBps: 0,
    peakSpeedBps: 0,
    totalDownloadedBytes: 0,
    activeCount: 0,
    queuedCount: 0,
    pausedCount: 0,
    completedCount: 0,
    failedCount: 0,
  },
};

class MockEventSource {
  addEventListener() {}
  close() {}
  onerror: (() => void) | null = null;
}

describe('NovaLoad Desktop UI', () => {
  beforeEach(() => {
    vi.stubGlobal('EventSource', MockEventSource);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/snapshot')) {
          return new Response(JSON.stringify(MOCK_SNAPSHOT), { status: 200 });
        }
        return new Response(JSON.stringify([]), { status: 200 });
      })
    );
  });

  it('renders NovaLoad dashboard, navigates to Downloads empty state, and opens Add Download modal', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('NovaLoad').length).toBeGreaterThan(0);
      expect(screen.getByText('Bandwidth Telemetry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'All Downloads' }));
    await waitFor(() => {
      expect(screen.getByText('No transfers in this view')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', { name: /Add Download/i });
    fireEvent.click(addButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Download URL')).toBeInTheDocument();
    });
  });
});
