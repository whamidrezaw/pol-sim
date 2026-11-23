import React, { useState } from 'react';
import { Hash, Play, Send } from 'lucide-react';
import { USSD_PRESETS } from '../data/seedData';
import { toPersianDigits } from '../lib/otp';
import { validateUssdCode } from '../lib/ussd';
import type { SimSlot, UssdHistoryEntry } from '../types/bridge';

interface UssdViewProps {
  history: UssdHistoryEntry[];
  pendingCode: string | null;
  onExecuteUssd: (code: string, simSlot: SimSlot, menuInput?: string) => Promise<void>;
}

export const UssdView: React.FC<UssdViewProps> = ({
  history,
  pendingCode,
  onExecuteUssd,
}) => {
  const [codeInput, setCodeInput] = useState('*1#');
  const [simSlot, setSimSlot] = useState<SimSlot>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [menuReply, setMenuReply] = useState('');

  const latest = history[0] ?? null;

  const handleRunCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const check = validateUssdCode(codeInput);
    if (!check.valid) {
      setValidationError(check.error ?? 'کد دستوری نامعتبر است.');
      return;
    }
    await onExecuteUssd(check.normalized, simSlot);
  };

  const handleMenuReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!latest || !menuReply.trim()) return;
    const reply = menuReply.trim();
    setMenuReply('');
    await onExecuteUssd(latest.code, latest.simSlot, reply);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Left: USSD Runner & Presets */}
      <div className="space-y-5 lg:col-span-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
          <h1 className="text-base font-bold text-slate-900 dark:text-white">
            اجرای کدهای دستوری USSD از راه دور
          </h1>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            استعلام مانده، خرید بسته اینترنت و فعال‌سازی سرویس‌های سیم‌کارت اندروید مستقیم از آیفون.
          </p>

          <form onSubmit={(e) => void handleRunCustom(e)} className="mt-4 space-y-4">
            <div>
              <label htmlFor="ussd-code-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                کد دستوری USSD
              </label>
              <input
                id="ussd-code-input"
                type="text"
                dir="ltr"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="*100#"
                className="font-mono-tabular mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-left text-base font-semibold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {validationError && (
                <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {validationError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {([1, 2] as const).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSimSlot(slot)}
                  className={`min-h-[40px] rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                    simSlot === slot
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  سیم {toPersianDigits(slot)} · {slot === 1 ? 'همراه اول' : 'ایرانسل'}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={Boolean(pendingCode)}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>{pendingCode ? `در حال اجرا (${pendingCode})...` : 'اجرای کد روی گوشی میزبان'}</span>
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            کدهای پرکاربرد اپراتورهای ایران
          </h2>
          <div className="mt-3 space-y-2">
            {USSD_PRESETS.map((preset) => (
              <button
                key={`${preset.code}-${preset.simSlot}`}
                type="button"
                onClick={() => {
                  setCodeInput(preset.code);
                  setSimSlot(preset.simSlot);
                  void onExecuteUssd(preset.code, preset.simSlot);
                }}
                className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 text-right transition-colors hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    {preset.label}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {preset.carrier} · سیم {toPersianDigits(preset.simSlot)}
                  </div>
                </div>
                <span dir="ltr" className="font-mono-tabular text-sm font-bold text-blue-700 dark:text-blue-400">
                  {preset.code}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Right: Live USSD Session & History */}
      <div className="space-y-5 lg:col-span-7">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              خروجی زنده شبکه اپراتور
            </h2>
            {latest && (
              <span dir="ltr" className="font-mono-tabular text-xs font-semibold text-slate-500 dark:text-slate-400">
                {latest.code} · SIM {latest.simSlot}
              </span>
            )}
          </div>

          {latest ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {latest.title} · {latest.carrierName}
                </div>
                <pre
                  data-testid="ussd-latest-response"
                  className="mt-2 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-800 dark:text-slate-100"
                >
                  {latest.response}
                </pre>
              </div>

              {latest.expectsReply && (
                <form onSubmit={(e) => void handleMenuReplySubmit(e)} className="flex items-center gap-2">
                  <label htmlFor="ussd-menu-reply" className="sr-only">
                    پاسخ به منوی USSD
                  </label>
                  <input
                    id="ussd-menu-reply"
                    type="text"
                    dir="ltr"
                    value={menuReply}
                    onChange={(e) => setMenuReply(e.target.value)}
                    placeholder="عدد گزینه موردنظر (مثلاً 1 یا 2)"
                    className="font-mono-tabular min-h-[42px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>ارسال پاسخ منو</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-slate-500">
              یک کد دستوری را اجرا کنید تا پاسخ شبکه نمایش داده شود.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            تاریخچه اجراهای USSD
          </h2>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((item) => (
              <div key={item.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span dir="ltr" className="font-mono-tabular text-xs font-bold text-slate-900 dark:text-white">
                      {item.code}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      · {item.carrierName} · سیم {toPersianDigits(item.simSlot)}
                    </span>
                  </div>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {item.response}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
