import React, { useState } from 'react';
import { Download, Share, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        <span>نصب اپلیکیشن</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowIOSGuide(true)}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{isIOS ? 'نصب روی آیفون' : 'راهنمای نصب PWA'}</span>
      </button>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4">
              <h3 id="pwa-guide-title" className="text-base font-semibold text-slate-900 dark:text-white">
                نصب پُل‌سیم روی صفحه اصلی گوشی
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="بستن راهنمای نصب"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <p className="font-semibold text-slate-900 dark:text-white">در آیفون (Safari):</p>
                <ol className="mt-2 list-decimal space-y-1.5 pr-5">
                  <li>
                    دکمه اشتراک‌گذاری (<Share className="mx-1 inline h-3.5 w-3.5" /> Share) در نوار پایین Safari را لمس کنید.
                  </li>
                  <li>
                    گزینه <strong>Add to Home Screen</strong> را انتخاب و تایید کنید.
                  </li>
                </ol>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <p className="font-semibold text-slate-900 dark:text-white">در اندروید (Chrome):</p>
                <p className="mt-1">
                  منوی سه نقطه مرورگر را باز کنید و گزینه <strong>Install app</strong> یا <strong>Add to Home screen</strong> را بزنید.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-900 shadow-sm dark:border-amber-700/60 dark:bg-amber-950 dark:text-amber-100 md:bottom-4"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>حالت آفلاین — داده‌های کش‌شده نمایش داده می‌شود</span>
    </div>
  );
};
