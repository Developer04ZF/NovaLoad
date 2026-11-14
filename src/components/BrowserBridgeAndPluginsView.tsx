/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Chrome, Puzzle, RefreshCw, Copy, Check, ShieldCheck, Globe } from 'lucide-react';
import type { AppSettings, PluginDescriptor } from '../shared/types';
import { api, getApiBaseUrl } from '../lib/api';
import { formatRelativeTime } from '../lib/format';
import { NovaIllustration } from './svg/NovaIllustrations';

interface BrowserPluginsProps {
  mode: 'browser' | 'plugins';
  settings: AppSettings;
  onRefreshSettings: () => void;
}

export const BrowserBridgeAndPluginsView: React.FC<BrowserPluginsProps> = ({
  mode,
  settings,
  onRefreshSettings,
}) => {
  const [bridgeStatus, setBridgeStatus] = useState<{
    enabled: boolean;
    tokenPreview: string;
    recentCaptures: Array<{ id: string; browser: string; url: string; filename: string | null; created_at: string }>;
  } | null>(null);
  const [plugins, setPlugins] = useState<PluginDescriptor[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const originBase = getApiBaseUrl() || window.location.origin;
  const bridgeCaptureUrl = `${originBase}/api/bridge/capture`;

  const loadData = async () => {
    if (mode === 'browser') {
      const st = await api.getBridgeStatus();
      setBridgeStatus(st);
    } else {
      const list = await api.getPlugins();
      setPlugins(list);
    }
  };

  useEffect(() => {
    void loadData();
  }, [mode, settings.browserBridgeEnabled, settings.browserBridgeToken]);

  const copyToken = async () => {
    await navigator.clipboard.writeText(settings.browserBridgeToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const copyEndpoint = async () => {
    await navigator.clipboard.writeText(bridgeCaptureUrl);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 1800);
  };

  const testHandoff = async () => {
    await fetch(bridgeCaptureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-novaload-token': settings.browserBridgeToken,
      },
      body: JSON.stringify({
        browser: 'chrome',
        url: `${originBase}/api/fixtures/file/release-checksums.txt`,
        filename: 'browser-captured-checksums.txt',
        referrer: originBase,
      }),
    });
    await loadData();
    onRefreshSettings();
  };

  if (mode === 'browser') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Browser Integration Bridge</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Connect NovaLoad extensions for Brave, Chrome, Edge, and Firefox using token-authenticated local download handoff.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={settings.browserBridgeEnabled}
              onChange={(e) =>
                void api.updateSettings({ browserBridgeEnabled: e.target.checked }).then(onRefreshSettings)
              }
              className="rounded border-slate-300 dark:border-slate-600 text-blue-600"
            />
            Bridge Active
          </label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Local Pairing Token & Endpoint</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1119] p-3">
                <div className="text-slate-500 dark:text-slate-400">Handoff Endpoint</div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="font-mono text-slate-900 dark:text-slate-100 truncate">
                    {bridgeCaptureUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyEndpoint()}
                    aria-label="Copy handoff endpoint"
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0"
                  >
                    {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1119] p-3">
                <div className="text-slate-500 dark:text-slate-400">Bridge Auth Token (x-novaload-token)</div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="font-mono text-slate-900 dark:text-slate-100 truncate">
                    {settings.browserBridgeToken}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => void copyToken()}
                      aria-label="Copy pairing token"
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => void api.rotateBridgeToken().then(onRefreshSettings)}
                      aria-label="Rotate pairing token"
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="font-semibold text-slate-900 dark:text-slate-100">Extension Installation Guide</div>
              <p>
                <span className="font-medium">Brave / Chrome / Edge (Manifest V3):</span> Extract your browser ZIP package (or select{' '}
                <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">extensions/brave|chrome|edge</code>), open{' '}
                <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">chrome://extensions</code> /{' '}
                <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">brave://extensions</code> /{' '}
                <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">edge://extensions</code>, enable Developer Mode, and click{' '}
                <span className="font-medium">Load unpacked</span>.
              </p>
              <p>
                <span className="font-medium">Firefox (WebExtension MV3):</span> Open{' '}
                <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">about:debugging#/runtime/this-firefox</code>, click{' '}
                <span className="font-medium">Load Temporary Add-on</span>, and select{' '}
                <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">extensions/firefox/manifest.json</code> (or load the packaged Firefox ZIP).
              </p>
            </div>

            <button
              type="button"
              onClick={() => void testHandoff()}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5" /> Simulate Browser Download Handoff
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 flex flex-col items-center justify-center text-center">
            <NovaIllustration scene="browser-integration" width={180} height={120} />
            <div className="text-xs font-medium text-slate-900 dark:text-slate-100 mt-3">
              Minimal Permission Architecture
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Extensions request only downloads, contextMenus, and storage permissions, validating every URL before handoff.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Recent Browser Captures</h2>
          {!bridgeStatus || bridgeStatus.recentCaptures.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No browser extension captures recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {bridgeStatus.recentCaptures.map((cap) => (
                <div key={cap.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {cap.filename || cap.url}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 truncate font-mono">
                      {cap.browser} · {cap.url}
                    </div>
                  </div>
                  <span className="font-mono text-slate-400 shrink-0">{formatRelativeTime(cap.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Plugin Architecture & Modules</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Capability-scoped extension registry with explicit permission boundaries. Arbitrary unsandboxed code execution is prohibited.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plugins.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Puzzle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    v{p.version} · {p.category} · {p.author}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={p.enabled}
                onChange={(e) => void api.togglePlugin(p.id, e.target.checked).then(setPlugins)}
                aria-label={`Toggle ${p.name}`}
                className="rounded border-slate-300 dark:border-slate-600 text-blue-600"
              />
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">{p.description}</p>

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Permissions: {p.permissions.join(', ')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
