/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Download,
  Activity,
  Clock,
  PauseCircle,
  CheckCircle2,
  AlertCircle,
  History,
  Layers,
  CalendarClock,
  FolderTree,
  Film,
  FolderOpen,
  Bot,
  Globe,
  Puzzle,
  Settings,
  BookOpen,
  Info,
  Plus,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import type { AppSettings, DashboardSnapshot, DownloadItem } from './shared/types';
import { api } from './lib/api';
import { formatSpeed } from './lib/format';
import { isRtlLocale, TRANSLATIONS } from './lib/i18n';
import { NovaLogoMark, NovaLoadingMark } from './components/svg/NovaLogo';
import { DashboardView } from './components/DashboardView';
import { DownloadsView, type DownloadFilterMode } from './components/DownloadsView';
import { AddDownloadModal } from './components/AddDownloadModal';
import { DownloadDetailsDrawer } from './components/DownloadDetailsDrawer';
import { QueuesAndSchedulerView } from './components/QueuesAndSchedulerView';
import { VideoDownloaderView } from './components/VideoDownloaderView';
import { FileManagerView } from './components/FileManagerView';
import { AiAssistantView } from './components/AiAssistantView';
import { BrowserBridgeAndPluginsView } from './components/BrowserBridgeAndPluginsView';
import { SettingsView } from './components/SettingsView';
import { DocsView } from './components/DocsView';

type NavTab =
  | 'dashboard'
  | 'all'
  | 'downloading'
  | 'queued'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'history'
  | 'queues'
  | 'scheduler'
  | 'categories'
  | 'video'
  | 'files'
  | 'ai'
  | 'browser'
  | 'plugins'
  | 'settings'
  | 'docs'
  | 'about';

export default function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'single' | 'batch'>('single');
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshSnapshot = useCallback(async () => {
    try {
      const snap = await api.getSnapshot();
      setSnapshot(snap);
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void refreshSnapshot();

    const evSource = new EventSource('/api/events');
    evSource.addEventListener('snapshot', (e) => {
      try {
        const parsed = JSON.parse((e as MessageEvent).data) as DashboardSnapshot;
        setSnapshot(parsed);
        setLoadError(null);
      } catch {
        // ignore malformed frame
      }
    });
    evSource.onerror = () => {
      // EventSource automatically retries; keep UI non-blocking
    };

    return () => {
      evSource.close();
    };
  }, [refreshSnapshot]);

  // Synchronize theme (dark / light / system) and locale RTL direction
  useEffect(() => {
    if (!snapshot) return;
    const { theme, locale } = snapshot.settings;

    const applyTheme = () => {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
      const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
      document.documentElement.classList.toggle('dark', isDark);
    };
    applyTheme();

    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlLocale(locale) ? 'rtl' : 'ltr';
  }, [snapshot?.settings.theme, snapshot?.settings.locale]);

  // Global keyboard shortcuts (Escape closes overlays)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAddModalOpen(false);
        setInspectedId(null);
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!snapshot && !loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0E14]">
        <NovaLoadingMark size={48} label="Starting NovaLoad" />
      </div>
    );
  }

  if (!snapshot && loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0E14] p-6">
        <div className="max-w-md rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-[#121722] p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h1 className="text-base font-semibold">Unable to reach NovaLoad engine</h1>
          <p className="text-xs text-slate-500">{loadError}</p>
          <button
            type="button"
            onClick={() => void refreshSnapshot()}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const snap = snapshot!;
  const t = TRANSLATIONS[snap.settings.locale] || TRANSLATIONS.en;
  const inspectedDownload: DownloadItem | null =
    inspectedId ? snap.downloads.find((d) => d.id === inspectedId) || null : null;

  const toggleQuickTheme = async () => {
    const nextTheme = snap.settings.theme === 'dark' ? 'light' : 'dark';
    const updated = await api.updateSettings({ theme: nextTheme });
    setSnapshot((prev) => (prev ? { ...prev, settings: updated } : prev));
  };

  const openAdd = (tab: 'single' | 'batch' = 'single') => {
    setAddModalTab(tab);
    setAddModalOpen(true);
  };

  const navGroups: Array<{
    title: string;
    items: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }>;
  }> = [
    {
      title: 'Overview',
      items: [{ id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard }],
    },
    {
      title: 'Transfers',
      items: [
        { id: 'all', label: t.nav.allDownloads, icon: Download, count: snap.downloads.length },
        { id: 'downloading', label: t.nav.active, icon: Activity, count: snap.stats.activeCount },
        { id: 'queued', label: t.nav.queued, icon: Clock, count: snap.stats.queuedCount },
        { id: 'paused', label: t.nav.paused, icon: PauseCircle, count: snap.stats.pausedCount },
        { id: 'completed', label: t.nav.completed, icon: CheckCircle2, count: snap.stats.completedCount },
        { id: 'failed', label: t.nav.failed, icon: AlertCircle, count: snap.stats.failedCount },
        { id: 'history', label: t.nav.history, icon: History },
      ],
    },
    {
      title: 'Automation',
      items: [
        { id: 'queues', label: t.nav.queues, icon: Layers },
        { id: 'scheduler', label: t.nav.scheduler, icon: CalendarClock },
        { id: 'categories', label: t.nav.categories, icon: FolderTree },
      ],
    },
    {
      title: 'Media & Intelligence',
      items: [
        { id: 'video', label: t.nav.video, icon: Film },
        { id: 'files', label: t.nav.files, icon: FolderOpen },
        { id: 'ai', label: t.nav.aiAssistant, icon: Bot },
      ],
    },
    {
      title: 'System',
      items: [
        { id: 'browser', label: t.nav.browserBridge, icon: Globe },
        { id: 'plugins', label: t.nav.plugins, icon: Puzzle },
        { id: 'settings', label: t.nav.settings, icon: Settings },
        { id: 'docs', label: t.nav.docs, icon: BookOpen },
        { id: 'about', label: t.nav.about, icon: Info },
      ],
    },
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Lockup */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
        <NovaLogoMark size={28} animated={snap.stats.activeCount > 0} />
        <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
          NovaLoad
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Primary navigation">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-2.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {group.title}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="font-mono tabular-nums text-[11px] text-slate-400 dark:text-slate-500">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );

  const isDownloadListTab = ['all', 'downloading', 'queued', 'paused', 'completed', 'failed', 'history'].includes(
    activeTab
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101520] sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 bg-white dark:bg-[#101520] border-r border-slate-200 dark:border-slate-800 h-full">
            {renderSidebarContent()}
          </div>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileNavOpen(false)}
            className="flex-1 bg-slate-950/50"
          />
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Utility Header */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#101520]/95 backdrop-blur-xs px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle navigation"
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              NovaLoad <span aria-hidden="true">/</span>{' '}
              <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline-block font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
              {formatSpeed(snap.stats.currentSpeedBps)}
            </span>
            <button
              type="button"
              onClick={() => void toggleQuickTheme()}
              aria-label="Toggle color theme"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              {snap.settings.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => openAdd('single')}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> {t.actions.addDownload}
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              snapshot={snap}
              t={t}
              onOpenAdd={openAdd}
              onInspect={(item) => setInspectedId(item.id)}
              onNavigate={(tab) => setActiveTab(tab as NavTab)}
              onRefresh={() => void refreshSnapshot()}
            />
          )}

          {isDownloadListTab && (
            <DownloadsView
              mode={activeTab as DownloadFilterMode}
              downloads={snap.downloads}
              categories={snap.categories}
              queues={snap.queues}
              onInspect={(item) => setInspectedId(item.id)}
              onOpenAdd={() => openAdd('single')}
              onRefresh={() => void refreshSnapshot()}
            />
          )}

          {(activeTab === 'queues' || activeTab === 'scheduler' || activeTab === 'categories') && (
            <QueuesAndSchedulerView
              section={activeTab}
              queues={snap.queues}
              categories={snap.categories}
              schedules={snap.schedules}
              onRefresh={() => void refreshSnapshot()}
            />
          )}

          {activeTab === 'video' && (
            <VideoDownloaderView
              downloads={snap.downloads}
              onRefresh={() => void refreshSnapshot()}
              onInspect={(item) => setInspectedId(item.id)}
            />
          )}

          {activeTab === 'files' && <FileManagerView />}

          {activeTab === 'ai' && (
            <AiAssistantView settings={snap.settings} onRefreshSettings={() => void refreshSnapshot()} />
          )}

          {(activeTab === 'browser' || activeTab === 'plugins') && (
            <BrowserBridgeAndPluginsView
              mode={activeTab}
              settings={snap.settings}
              onRefreshSettings={() => void refreshSnapshot()}
            />
          )}

          {(activeTab === 'settings' || activeTab === 'about') && (
            <SettingsView
              key={activeTab}
              initialSection={activeTab === 'about' ? 'about' : 'settings'}
              settings={snap.settings}
              onUpdated={(next: AppSettings) =>
                setSnapshot((prev) => (prev ? { ...prev, settings: next } : prev))
              }
            />
          )}

          {activeTab === 'docs' && <DocsView />}
        </main>
      </div>

      {/* Add Download Modal */}
      <AddDownloadModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        queues={snap.queues}
        categories={snap.categories}
        defaultConnections={snap.settings.defaultConnections}
        initialTab={addModalTab}
        onCreated={() => void refreshSnapshot()}
      />

      {/* Download Details & Segment Inspector Drawer */}
      <DownloadDetailsDrawer
        download={inspectedDownload}
        onClose={() => setInspectedId(null)}
        onRefresh={() => void refreshSnapshot()}
      />
    </div>
  );
}
