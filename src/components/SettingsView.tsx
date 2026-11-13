/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Shield, Database, Sun, Moon, Monitor, CheckCircle2 } from 'lucide-react';
import type { AppSettings, LocaleCode, ThemeMode } from '../shared/types';
import { api } from '../lib/api';
import { NovaLogoMark } from './svg/NovaLogo';
import { NoviMascot, type NoviExpression } from './svg/NoviMascot';
import { ALL_ILLUSTRATION_SCENES, NovaIllustration } from './svg/NovaIllustrations';

interface SettingsViewProps {
  initialSection?: 'settings' | 'about';
  settings: AppSettings;
  onUpdated: (next: AppSettings) => void;
}

const NOVI_STATES: NoviExpression[] = ['idle', 'happy', 'working', 'downloading', 'success', 'warning', 'error'];

export const SettingsView: React.FC<SettingsViewProps> = ({
  initialSection = 'settings',
  settings,
  onUpdated,
}) => {
  const [tab, setTab] = useState<'general' | 'connections' | 'storage' | 'privacy' | 'about'>(
    initialSection === 'about' ? 'about' : 'general'
  );
  const [dbStatus, setDbStatus] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  const patchSetting = async (patch: Partial<AppSettings>) => {
    const updated = await api.updateSettings(patch);
    onUpdated(updated);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1400);
  };

  const handleVerifyDb = async () => {
    const res = await api.checkHealth();
    setDbStatus(`SQLite PRAGMA integrity_check: ${res.database.details}`);
  };

  const handleExportBackup = async () => {
    const snap = await api.exportDatabase();
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novaload-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {tab === 'about' ? 'About NovaLoad & Visual Assets' : 'Preferences & System Settings'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure theme, localization, engine concurrency, global speed caps, database maintenance, and privacy guardrails.
          </p>
        </div>
        {savedToast && (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/70 w-fit">
        {(
          [
            { id: 'general', label: 'General & Appearance' },
            { id: 'connections', label: 'Engine & Speed' },
            { id: 'storage', label: 'Storage & Database' },
            { id: 'privacy', label: 'Security & Privacy' },
            { id: 'about', label: 'About & SVG Gallery' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === item.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-5 text-xs">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Theme Mode</h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'system', label: 'System', icon: Monitor },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => void patchSetting({ theme: id as ThemeMode })}
                  className={`px-3.5 py-2 rounded-lg border inline-flex items-center gap-1.5 font-medium ${
                    settings.theme === id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="pref-locale" className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
              Interface Language & Text Direction
            </label>
            <select
              id="pref-locale"
              value={settings.locale}
              onChange={(e) => void patchSetting({ locale: e.target.value as LocaleCode })}
              className="w-full max-w-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
            >
              <option value="en">English (LTR)</option>
              <option value="fa">فارسی — Persian (RTL)</option>
              <option value="ar">العربية — Arabic (RTL)</option>
            </select>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoCategorize}
                onChange={(e) => void patchSetting({ autoCategorize: e.target.checked })}
                className="rounded border-slate-300 dark:border-slate-600 text-blue-600"
              />
              <span>Automatically organize completed downloads into category subfolders</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.clipboardMonitoring}
                onChange={(e) => void patchSetting({ clipboardMonitoring: e.target.checked })}
                className="rounded border-slate-300 dark:border-slate-600 text-blue-600"
              />
              <span>Pre-fill New Download dialog from clipboard URL when permitted</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyOnComplete}
                onChange={(e) => void patchSetting({ notifyOnComplete: e.target.checked })}
                className="rounded border-slate-300 dark:border-slate-600 text-blue-600"
              />
              <span>Show notifications on download completion</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.minimizeToTray}
                onChange={(e) => void patchSetting({ minimizeToTray: e.target.checked })}
                className="rounded border-slate-300 dark:border-slate-600 text-blue-600"
              />
              <span>Minimize desktop shell to system tray while transfers are active</span>
            </label>
          </div>
        </div>
      )}

      {tab === 'connections' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Default Parallel Connections
              </label>
              <input
                type="number"
                min={1}
                max={16}
                defaultValue={settings.defaultConnections}
                onBlur={(e) => void patchSetting({ defaultConnections: Number(e.target.value) || 6 })}
                className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Global Max Concurrent Downloads
              </label>
              <input
                type="number"
                min={1}
                max={16}
                defaultValue={settings.maxGlobalConcurrent}
                onBlur={(e) => void patchSetting({ maxGlobalConcurrent: Number(e.target.value) || 4 })}
                className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Global Speed Limit (KB/s)
              </label>
              <input
                type="number"
                min={0}
                placeholder="Unlimited"
                defaultValue={settings.globalSpeedLimitKbps ?? ''}
                onBlur={(e) =>
                  void patchSetting({
                    globalSpeedLimitKbps: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoRetry}
                onChange={(e) => void patchSetting({ autoRetry: e.target.checked })}
                className="rounded border-slate-300 dark:border-slate-600 text-blue-600"
              />
              <span>Automatically retry transient network failures with exponential backoff</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.verifyChecksumOnComplete}
                onChange={(e) => void patchSetting({ verifyChecksumOnComplete: e.target.checked })}
                className="rounded border-slate-300 dark:border-slate-600 text-blue-600"
              />
              <span>Compute SHA-256 and SHA-512 digests upon download completion</span>
            </label>
          </div>
        </div>
      )}

      {tab === 'storage' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-4 text-xs">
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">Managed Downloads Directory</div>
            <div className="font-mono text-slate-600 dark:text-slate-300 mt-1">{settings.defaultDownloadDir}</div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => void handleVerifyDb()}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 font-medium"
            >
              <Database className="w-3.5 h-3.5" /> Run SQLite Integrity Check
            </button>
            <button
              type="button"
              onClick={() => void handleExportBackup()}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5 font-medium"
            >
              <Download className="w-3.5 h-3.5" /> Export Database Snapshot (JSON)
            </button>
          </div>
          {dbStatus && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-3 py-2 font-mono">
              {dbStatus}
            </div>
          )}
        </div>
      )}

      {tab === 'privacy' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-4 text-xs">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Security & SSRF Protections
          </h2>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.privacyBlockPrivateIps}
              onChange={(e) => void patchSetting({ privacyBlockPrivateIps: e.target.checked })}
              className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-blue-600"
            />
            <span>
              Block downloads targeting private, loopback, or cloud metadata IP ranges (SSRF protection; local verification fixtures remain explicitly scoped)
            </span>
          </label>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-1 text-slate-600 dark:text-slate-300">
            <div>· Zero hidden telemetry or analytics trackers.</div>
            <div>· Downloaded files are never executed automatically.</div>
            <div>· Path traversal containment ensures all writes stay within the managed downloads folder.</div>
          </div>
        </div>
      )}

      {tab === 'about' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <NovaLogoMark size={48} animated />
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">NovaLoad v1.0.0</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Download smarter. Manage everything. · Licensed under Apache License 2.0
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Channel: {settings.releaseChannel} · Tauri 2 + Rust + React + SQLite
            </div>
          </div>

          {/* Mascot Expression Catalog */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Novi Mascot Expression System</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {NOVI_STATES.map((expr) => (
                <div key={expr} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex flex-col items-center text-center">
                  <NoviMascot expression={expr} size={64} />
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-1.5 capitalize">
                    {expr}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom SVG Illustration Catalog */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Custom SVG Illustration Catalog (16 Scenes)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ALL_ILLUSTRATION_SCENES.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex flex-col items-center text-center">
                  <NovaIllustration scene={item.id} width={140} height={94} />
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-2">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
