import React from 'react';
import { BookOpen, Hash, MessageSquare, Phone, QrCode } from 'lucide-react';
import { toPersianDigits } from '../lib/otp';

export type NavTab = 'messages' | 'calls' | 'ussd' | 'architecture';

interface TopBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenPairing: () => void;
  unreadSmsCount: number;
  missedCallsCount: number;
}

const NAV_ITEMS: Array<{ id: NavTab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'messages', label: 'پیامک و رمز پویا', shortLabel: 'پیامک', icon: MessageSquare },
  { id: 'calls', label: 'تماس و دایورت', shortLabel: 'تماس', icon: Phone },
  { id: 'ussd', label: 'کدهای USSD', shortLabel: 'USSD', icon: Hash },
  { id: 'architecture', label: 'معماری و نیتیو', shortLabel: 'معماری', icon: BookOpen },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenPairing,
  unreadSmsCount,
  missedCallsCount,
}) => {
  return (
    <>
      <header className="sticky top-0 z-30 h-14 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-[#111827]/95">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-8 px-4 md:px-6">
          {/* Zone 1: Single-element brand wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onSelectTab('messages');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            پُل‌سیم
          </a>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav aria-label="ناوبری اصلی" className="hidden md:flex items-center gap-7">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              const count =
                item.id === 'messages'
                  ? unreadSmsCount
                  : item.id === 'calls'
                    ? missedCallsCount
                    : 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex h-14 items-center gap-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600 ${
                    isActive
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  <span>{item.label}</span>
                  {count > 0 && (
                    <span className="tabular-nums text-xs font-semibold text-blue-700 dark:text-blue-400">
                      ({toPersianDigits(count)})
                    </span>
                  )}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute right-0 bottom-0 left-0 h-0.5 bg-blue-700 dark:bg-blue-400"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single primary action button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onOpenPairing}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
            >
              <QrCode className="h-4 w-4" aria-hidden="true" />
              <span>اتصال گوشی</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Thumb-Zone Navigation (64px height; combined sticky = 120px <= 14.2% of 844px) */}
      <nav
        aria-label="منوی پایین موبایل"
        className="fixed right-0 bottom-0 left-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe dark:border-slate-800 dark:bg-[#111827]/95 md:hidden"
      >
        <div className="grid h-16 grid-cols-4 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const count =
              item.id === 'messages'
                ? unreadSmsCount
                : item.id === 'calls'
                  ? missedCallsCount
                  : 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-1 transition-colors ${
                  isActive
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {count > 0 && (
                    <span className="tabular-nums absolute -top-1.5 -left-2.5 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                      {toPersianDigits(count)}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium whitespace-nowrap">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
