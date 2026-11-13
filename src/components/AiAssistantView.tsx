/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Send, CheckCircle2, AlertTriangle, Shield, Loader2, Trash2, Activity } from 'lucide-react';
import type { AiActionPlan, AiHistoryEntry, AppSettings } from '../shared/types';
import { api } from '../lib/api';
import { formatRelativeTime } from '../lib/format';
import { NoviMascot } from './svg/NoviMascot';

interface AiAssistantViewProps {
  settings: AppSettings;
  onRefreshSettings: () => void;
}

const SUGGESTED_PROMPTS = [
  'Find my largest downloaded files and summarize storage usage.',
  'Find possible duplicate files and suggest cleanup actions.',
  'Suggest a clean folder structure for my downloaded documents and archives.',
  'Find old archive files and suggest standardized naming conventions.',
];

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({ settings, onRefreshSettings }) => {
  const [status, setStatus] = useState<{ configured: boolean; enabled: boolean; model: string; keySource: string } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs: number } | null>(null);
  const [activePlan, setActivePlan] = useState<{ plan: AiActionPlan; historyId: string } | null>(null);
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set());
  const [execResult, setExecResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AiHistoryEntry[]>([]);

  const loadAiData = async () => {
    const [st, hist] = await Promise.all([api.getAiStatus(), api.getAiHistory()]);
    setStatus(st);
    setHistory(hist);
  };

  useEffect(() => {
    void loadAiData();
  }, [settings.aiEnabled, settings.aiModel]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testAiConnection(settings.aiModel);
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  const handleAnalyze = async (e?: React.FormEvent, overridePrompt?: string) => {
    e?.preventDefault();
    const targetPrompt = (overridePrompt ?? prompt).trim();
    if (!targetPrompt) return;
    setLoading(true);
    setError(null);
    setExecResult(null);
    try {
      const res = await api.analyzeWithAi(targetPrompt);
      setActivePlan({ plan: res.plan, historyId: res.historyEntry.id });
      setSelectedActionIds(new Set(res.plan.actions.map((a) => a.id)));
      setPrompt('');
      await loadAiData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteApproved = async () => {
    if (!activePlan) return;
    const approved = activePlan.plan.actions.filter((a) => selectedActionIds.has(a.id));
    if (approved.length === 0) return;

    const res = await api.executeFileActions(approved, activePlan.historyId);
    setExecResult(
      res.failed.length > 0
        ? `Executed ${res.succeeded} action(s). ${res.failed.length} failed: ${res.failed[0].error}`
        : `Executed ${res.succeeded} approved file operation(s) safely.`
    );
    setActivePlan(null);
    await loadAiData();
  };

  const updateAiPref = async (patch: Partial<AppSettings>) => {
    await api.updateSettings(patch);
    onRefreshSettings();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Gemini AI File Assistant</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Optional natural-language storage analysis and organization plans. All file changes require your explicit preview and approval.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.aiEnabled}
            onChange={(e) => void updateAiPref({ aiEnabled: e.target.checked })}
            className="rounded border-slate-300 dark:border-slate-600 text-blue-600"
          />
          Enable AI Assistant
        </label>
      </div>

      {/* Gemini Configuration & Privacy Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Gemini Server Configuration</h2>
            <span className={`text-xs font-medium ${status?.configured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {status?.configured ? 'Server Key Active' : 'No Key in Secrets'}
            </span>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div>Credential source: {status?.keySource || 'Checking...'}</div>
            <div>Server-side proxy: <span className="font-mono">/api/ai/*</span> (never exposed to browser)</div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[180px]">
              <label htmlFor="ai-model" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Model
              </label>
              <select
                id="ai-model"
                value={settings.aiModel}
                onChange={(e) => void updateAiPref({ aiModel: e.target.value as AppSettings['aiModel'] })}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119]"
              >
                <option value="gemini-4-hydrogen">gemini-4-hydrogen (Recommended)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Low Latency)</option>
              </select>
            </div>
            <div className="pt-5">
              <button
                type="button"
                disabled={testing}
                onClick={() => void handleTestConnection()}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                Test Connection
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`rounded-lg px-3 py-2 text-xs ${testResult.ok ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'}`}>
              {testResult.message} {testResult.latencyMs > 0 ? `(${testResult.latencyMs}ms)` : ''}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" /> AI Permissions & Privacy Guardrails
          </h2>
          <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.aiRequireConfirmation}
              onChange={(e) => void updateAiPref({ aiRequireConfirmation: e.target.checked })}
              className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-blue-600"
            />
            <span>Enforce preview-and-confirm dialog before moving, renaming, or deleting any file</span>
          </label>
          <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.aiAllowFileMetadata}
              onChange={(e) => void updateAiPref({ aiAllowFileMetadata: e.target.checked })}
              className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-blue-600"
            />
            <span>Share local file metadata (filenames, sizes, extensions, SHA-256 prefixes) for analysis</span>
          </label>
          <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.aiAllowFileContent}
              onChange={(e) => void updateAiPref({ aiAllowFileContent: e.target.checked })}
              className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-blue-600"
            />
            <span>Allow reading text file snippets when explicitly requested (disabled by default)</span>
          </label>
        </div>
      </div>

      {/* Prompt Workspace */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-4">
        <div className="flex items-center gap-3">
          <NoviMascot expression={loading ? 'working' : error ? 'error' : 'idle'} size={52} />
          <div className="text-xs text-slate-600 dark:text-slate-300">
            Ask NovaLoad AI to audit your downloads directory, detect duplicates, or generate a safe file organization plan.
          </div>
        </div>

        <form onSubmit={(e) => void handleAnalyze(e)} className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!settings.aiEnabled || loading}
            placeholder="e.g., Find my largest downloaded files and suggest folder organization"
            className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1119] text-slate-900 dark:text-slate-100 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!settings.aiEnabled || loading || !prompt.trim()}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Analyze
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((sp) => (
            <button
              key={sp}
              type="button"
              disabled={!settings.aiEnabled || loading}
              onClick={() => void handleAnalyze(undefined, sp)}
              className="px-2.5 py-1 text-[11px] rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              {sp}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {execResult && (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{execResult}</span>
          </div>
        )}
      </div>

      {/* Preview & Confirm Proposed Action Plan */}
      {activePlan && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/70 bg-white dark:bg-[#121722] p-5 space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activePlan.plan.summary}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{activePlan.plan.answer}</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 shrink-0">{activePlan.plan.modelUsed}</span>
          </div>

          {activePlan.plan.actions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Proposed File Operations — Review & Confirm Before Execution
              </h4>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
                {activePlan.plan.actions.map((act) => (
                  <label key={act.id} className="p-3 flex items-start gap-3 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <input
                      type="checkbox"
                      checked={selectedActionIds.has(act.id)}
                      onChange={() =>
                        setSelectedActionIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(act.id)) next.delete(act.id);
                          else next.add(act.id);
                          return next;
                        })
                      }
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        [{act.type.toUpperCase()}] {act.description}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {act.sourcePath} {act.targetPath ? `→ ${act.targetPath}` : ''} · Risk: {act.riskLevel}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5">{act.reason}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActivePlan(null)}
                  className="px-3.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Dismiss Plan
                </button>
                <button
                  type="button"
                  disabled={selectedActionIds.size === 0}
                  onClick={() => void handleExecuteApproved()}
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  Approve & Execute ({selectedActionIds.size})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Activity History */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI Activity History</h2>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => void api.clearAiHistory().then(loadAiData)}
              className="text-xs text-slate-500 hover:text-red-600 inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear History
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">No AI queries recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            {history.map((h) => (
              <div key={h.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{h.prompt}</span>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0">
                    {h.model} · {h.status} · {formatRelativeTime(h.createdAt)}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">{h.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
