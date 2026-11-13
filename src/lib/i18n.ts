/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LocaleCode } from '../shared/types';

export interface TranslationStrings {
  tagline: string;
  nav: {
    dashboard: string;
    allDownloads: string;
    active: string;
    queued: string;
    paused: string;
    completed: string;
    failed: string;
    history: string;
    queues: string;
    scheduler: string;
    categories: string;
    video: string;
    files: string;
    aiAssistant: string;
    browserBridge: string;
    plugins: string;
    settings: string;
    docs: string;
    about: string;
  };
  actions: {
    addDownload: string;
    batchImport: string;
    pauseAll: string;
    resumeAll: string;
    pause: string;
    resume: string;
    retry: string;
    cancel: string;
    verify: string;
    delete: string;
    save: string;
  };
  metrics: {
    currentSpeed: string;
    peakSpeed: string;
    totalData: string;
    activeTransfers: string;
    completedFiles: string;
    queueStatus: string;
  };
}

const EN: TranslationStrings = {
  tagline: 'Download smarter. Manage everything.',
  nav: {
    dashboard: 'Dashboard',
    allDownloads: 'All Downloads',
    active: 'Active',
    queued: 'Queued',
    paused: 'Paused',
    completed: 'Completed',
    failed: 'Failed',
    history: 'History',
    queues: 'Queues',
    scheduler: 'Scheduler',
    categories: 'Categories',
    video: 'Video & Media',
    files: 'File Manager',
    aiAssistant: 'AI Assistant',
    browserBridge: 'Browser Bridge',
    plugins: 'Plugins',
    settings: 'Preferences',
    docs: 'Documentation',
    about: 'About NovaLoad',
  },
  actions: {
    addDownload: 'Add Download',
    batchImport: 'Batch Import',
    pauseAll: 'Pause All',
    resumeAll: 'Resume All',
    pause: 'Pause',
    resume: 'Resume',
    retry: 'Retry',
    cancel: 'Cancel',
    verify: 'Verify Hash',
    delete: 'Delete',
    save: 'Save Changes',
  },
  metrics: {
    currentSpeed: 'Current Speed',
    peakSpeed: 'Peak Speed',
    totalData: 'Total Transferred',
    activeTransfers: 'Active Transfers',
    completedFiles: 'Completed',
    queueStatus: 'Queued',
  },
};

const FA: TranslationStrings = {
  tagline: 'هوشمندتر دانلود کنید. همه‌چیز را مدیریت کنید.',
  nav: {
    dashboard: 'داشبورد',
    allDownloads: 'همه دانلودها',
    active: 'در حال انجام',
    queued: 'در صف',
    paused: 'متوقف‌شده',
    completed: 'تکمیل‌شده',
    failed: 'ناموفق',
    history: 'تاریخچه',
    queues: 'مدیریت صف',
    scheduler: 'زمان‌بندی',
    categories: 'دسته‌بندی‌ها',
    video: 'دانلود ویدیو',
    files: 'مدیریت فایل',
    aiAssistant: 'دستیار هوشمند',
    browserBridge: 'افزونه مرورگر',
    plugins: 'افزونه‌ها',
    settings: 'تنظیمات',
    docs: 'مستندات',
    about: 'درباره نووالود',
  },
  actions: {
    addDownload: 'افزودن دانلود',
    batchImport: 'افزودن گروهی',
    pauseAll: 'توقف همه',
    resumeAll: 'ادامه همه',
    pause: 'توقف',
    resume: 'ادامه',
    retry: 'تلاش مجدد',
    cancel: 'لغو',
    verify: 'بررسی اصالت',
    delete: 'حذف',
    save: 'ذخیره تغییرات',
  },
  metrics: {
    currentSpeed: 'سرعت فعلی',
    peakSpeed: 'اوج سرعت',
    totalData: 'حجم دریافتی',
    activeTransfers: 'دانلودهای فعال',
    completedFiles: 'تکمیل‌شده',
    queueStatus: 'در صف انتظار',
  },
};

const AR: TranslationStrings = {
  tagline: 'حمّل بذكاء. أدر كل شيء.',
  nav: {
    dashboard: 'لوحة التحكم',
    allDownloads: 'جميع التنزيلات',
    active: 'نشطة',
    queued: 'في الانتظار',
    paused: 'متوقفة',
    completed: 'مكتملة',
    failed: 'فاشلة',
    history: 'السجل',
    queues: 'قوائم الانتظار',
    scheduler: 'المجدول',
    categories: 'التصنيفات',
    video: 'تحميل الفيديو',
    files: 'إدارة الملفات',
    aiAssistant: 'المساعد الذكي',
    browserBridge: 'تكامل المتصفح',
    plugins: 'الإضافات',
    settings: 'الإعدادات',
    docs: 'التوثيق',
    about: 'حول نوفالود',
  },
  actions: {
    addDownload: 'إضافة تنزيل',
    batchImport: 'استيراد دفعة',
    pauseAll: 'إيقاف الكل',
    resumeAll: 'استئناف الكل',
    pause: 'إيقاف',
    resume: 'استئناف',
    retry: 'إعادة المحاولة',
    cancel: 'إلغاء',
    verify: 'التحقق من التجزئة',
    delete: 'حذف',
    save: 'حفظ التغييرات',
  },
  metrics: {
    currentSpeed: 'السرعة الحالية',
    peakSpeed: 'أقصى سرعة',
    totalData: 'البيانات المنقولة',
    activeTransfers: 'التنزيلات النشطة',
    completedFiles: 'مكتملة',
    queueStatus: 'في الانتظار',
  },
};

export const TRANSLATIONS: Record<LocaleCode, TranslationStrings> = {
  en: EN,
  fa: FA,
  ar: AR,
};

export function isRtlLocale(locale: LocaleCode): boolean {
  return locale === 'fa' || locale === 'ar';
}
