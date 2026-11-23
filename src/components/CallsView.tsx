import React, { useState } from 'react';
import {
  Delete,
  Headphones,
  Phone,
  PhoneForwarded,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Radio,
} from 'lucide-react';
import type { CallLogEntry, CallTier, ContactItem, HostTelemetry, SimSlot } from '../types/bridge';
import { buildCallForwardingUssd } from '../lib/ussd';
import { normalizeDigits, toPersianDigits } from '../lib/otp';

interface CallsViewProps {
  callLogs: CallLogEntry[];
  contacts: ContactItem[];
  telemetry: HostTelemetry;
  onDial: (number: string, contactName: string, simSlot: SimSlot) => Promise<void>;
  onSelectCallTier: (tier: CallTier) => Promise<void>;
  onSendForwardingUssd: (code: string, simSlot: SimSlot, forwardNumber: string, enabled: boolean) => Promise<void>;
}

const DIALPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

function formatDuration(sec: number): string {
  if (sec <= 0) return 'پاسخ داده نشد';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${toPersianDigits(String(m).padStart(2, '0'))}:${toPersianDigits(String(s).padStart(2, '0'))}`;
}

export const CallsView: React.FC<CallsViewProps> = ({
  callLogs,
  contacts,
  telemetry,
  onDial,
  onSelectCallTier,
  onSendForwardingUssd,
}) => {
  const [dialInput, setDialInput] = useState('');
  const [dialSim, setDialSim] = useState<SimSlot>(1);
  const [dialError, setDialError] = useState<string | null>(null);

  const [voipNumber, setVoipNumber] = useState(telemetry.voipForwardNumber);
  const [forwardSim, setForwardSim] = useState<SimSlot>(1);
  const [forwardError, setForwardError] = useState<string | null>(null);
  const [forwardNotice, setForwardNotice] = useState<string | null>(null);

  const handleDialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialError(null);
    const cleaned = normalizeDigits(dialInput).replace(/[\s\-()]/g, '');
    if (!/^[0-9+*#]{3,16}$/.test(cleaned)) {
      setDialError('شماره تلفن معتبر وارد کنید.');
      return;
    }
    const contact = contacts.find((c) => c.number === cleaned);
    await onDial(cleaned, contact?.name ?? cleaned, dialSim);
  };

  const handleEnableForwarding = async () => {
    setForwardError(null);
    setForwardNotice(null);
    const built = buildCallForwardingUssd(voipNumber, 'enable');
    if (!built.valid || !built.code) {
      setForwardError(built.error ?? 'شماره خط VoIP معتبر نیست.');
      return;
    }
    await onSendForwardingUssd(built.code, forwardSim, normalizeDigits(voipNumber), true);
    setForwardNotice(`کد دایورت ${built.code} از طریق پل رمزنگاری‌شده روی سیم ${forwardSim} اجرا شد.`);
  };

  const handleDisableForwarding = async () => {
    setForwardError(null);
    setForwardNotice(null);
    const built = buildCallForwardingUssd('', 'disable');
    if (built.code) {
      await onSendForwardingUssd(built.code, forwardSim, voipNumber, false);
      setForwardNotice(`کد لغو دایورت ${built.code} روی سیم ${forwardSim} اجرا شد.`);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Left: Dialer & Contacts */}
      <div className="space-y-5 lg:col-span-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
          <h1 className="text-base font-bold text-slate-900 dark:text-white">
            شماره‌گیر کنترل از راه دور
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            تماس با سیم‌کارت گوشی اندروید شما برقرار می‌شود و از آیفون مدیریت می‌گردد.
          </p>

          <form onSubmit={(e) => void handleDialSubmit(e)} className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <label htmlFor="dialer-input" className="sr-only">
                شماره تلفن برای شماره‌گیری
              </label>
              <input
                id="dialer-input"
                type="tel"
                dir="ltr"
                value={dialInput}
                onChange={(e) => {
                  setDialInput(e.target.value);
                  if (dialError) setDialError(null);
                }}
                placeholder="0912..."
                className="font-mono-tabular min-h-[48px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-xl font-semibold tracking-wider text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setDialInput((v) => v.slice(0, -1))}
                aria-label="حذف رقم آخر"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>

            <div dir="ltr" className="grid grid-cols-3 gap-2">
              {DIALPAD_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDialInput((v) => v + key)}
                  className="font-mono-tabular min-h-[48px] rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-800 transition-colors hover:bg-slate-50 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  {key}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {([1, 2] as const).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setDialSim(slot)}
                  className={`min-h-[40px] rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                    dialSim === slot
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  سیم {toPersianDigits(slot)} · {slot === 1 ? 'همراه اول' : 'ایرانسل'}
                </button>
              ))}
            </div>

            {dialError && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {dialError}
              </p>
            )}

            <button
              type="submit"
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              <span>برقراری تماس از سیم {toPersianDigits(dialSim)}</span>
            </button>
          </form>
        </section>

        {/* Synced Contacts Quick Dial */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            مخاطبین همگام‌سازی‌شده
          </h2>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{c.name}</div>
                  <div dir="ltr" className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                    {c.number}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void onDial(c.number, c.name, c.preferredSim)}
                  aria-label={`تماس با ${c.name}`}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Phone className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  <span>تماس</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Right: 3-Tier Voice Strategy + Call History */}
      <div className="space-y-5 lg:col-span-7">
        {/* 3-Tier Voice Strategy Selector */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                استراتژی ۳ سطحی تماس صوتی
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                چون اپل نقش هندزفری بلوتوث (HFP Client) را روی iOS مسدود کرده، مسیر واقعی صدا را انتخاب کنید.
              </p>
            </div>
          </div>

          <div
            role="group"
            aria-label="انتخاب سطح تماس صوتی"
            className="mt-4 grid gap-2 sm:grid-cols-3"
          >
            {(
              [
                {
                  id: 'level1_multipoint',
                  title: 'سطح ۱: Multipoint',
                  subtitle: 'بدون روت · رایگان',
                },
                {
                  id: 'level2_callkit_voip',
                  title: 'سطح ۲: CallKit + VoIP',
                  subtitle: 'زنگ بومی آیفون · دایورت',
                },
                {
                  id: 'level3_root_hardware',
                  title: 'سطح ۳: روت / ESP32',
                  subtitle: 'استریم مستقیم GSM',
                },
              ] as const
            ).map((tier) => {
              const active = telemetry.callTier === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => void onSelectCallTier(tier.id)}
                  className={`min-h-[60px] rounded-xl border p-3 text-right transition-colors ${
                    active
                      ? 'border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/35'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{tier.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {tier.subtitle}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Tier Details */}
          <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
            {telemetry.callTier === 'level1_multipoint' && (
              <div className="space-y-2 text-xs leading-6 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <Headphones className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <span>
                    هندزفری Multipoint متصل:{' '}
                    {telemetry.multipointHeadsetName ?? 'متصل نیست'}
                  </span>
                </div>
                <p>
                  تماس ورودی به صورت لحظه‌ای روی صفحه آیفون نمایش داده می‌شود؛ با لمس «پاسخ» روی آیفون، صدا مستقیماً از طریق گوشی اندرویدی داخل هندزفری دوکاره (Multipoint) پخش می‌شود بدون اینکه اندروید را از جیب درآورید.
                </p>
              </div>
            )}

            {telemetry.callTier === 'level2_callkit_voip' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                  <PhoneForwarded className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <span>دایورت هوشمند سیم‌کارت روی خط VoIP/SIP داخلی (تجربه بومی Apple CallKit)</span>
                </div>
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  شماره خط اینترنتی (SIP/VoIP) متصل به اپ آیفون را وارد کنید تا کد دستوری <span dir="ltr" className="font-mono-tabular font-semibold">**21*شماره#</span> مستقیماً روی گوشی اندروید اجرا شود.
                </p>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="voip-forward-number" className="sr-only">
                      شماره خط VoIP برای دایورت تماس
                    </label>
                    <input
                      id="voip-forward-number"
                      type="tel"
                      dir="ltr"
                      value={voipNumber}
                      onChange={(e) => {
                        setVoipNumber(e.target.value);
                        if (forwardError) setForwardError(null);
                      }}
                      placeholder="02191004820"
                      className="font-mono-tabular min-h-[42px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <select
                    aria-label="سیم‌کارت هدف برای دایورت"
                    value={forwardSim}
                    onChange={(e) => setForwardSim(Number(e.target.value) as SimSlot)}
                    className="min-h-[42px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value={1}>سیم ۱ (همراه اول)</option>
                    <option value={2}>سیم ۲ (ایرانسل)</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleEnableForwarding()}
                    className="min-h-[40px] rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                  >
                    فعال‌سازی دایورت (**21*)
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDisableForwarding()}
                    className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    لغو دایورت (##21#)
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    وضعیت فعلی: {telemetry.forwardingEnabled ? 'دایورت فعال' : 'دایورت غیرفعال'}
                  </span>
                </div>

                {forwardError && (
                  <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                    {forwardError}
                  </p>
                )}
                {forwardNotice && (
                  <p role="status" className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {forwardNotice}
                  </p>
                )}
              </div>
            )}

            {telemetry.callTier === 'level3_root_hardware' && (
              <div className="space-y-2 text-xs leading-6 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <Radio className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <span>ماژول کاربران پیشرفته (فاز ۳)</span>
                </div>
                <p>
                  برای مکالمه مستقیم با شماره سیم‌کارت بدون دایورت مخابراتی: استفاده از سرویس ضبط/تزریق صوت کرنل در اندروید روت‌شده (WebRTC Opus روی شبکه Wi-Fi محلی) یا دروازه سخت‌افزاری ESP32 + SIM800/A7670 با پروتکل بومی CallKit.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Call History Table */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            تاریخچه تماس‌های همگام‌سازی‌شده
          </h2>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {callLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                هنوز تماسی ثبت نشده است.
              </p>
            ) : (
              callLogs.map((entry) => {
                const Icon =
                  entry.direction === 'missed' || entry.direction === 'rejected'
                    ? PhoneMissed
                    : entry.direction === 'outgoing'
                      ? PhoneOutgoing
                      : PhoneIncoming;
                const iconColor =
                  entry.direction === 'missed' || entry.direction === 'rejected'
                    ? 'text-red-600 dark:text-red-400'
                    : entry.direction === 'outgoing'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-emerald-600 dark:text-emerald-400';

                return (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {entry.contactName}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span dir="ltr" className="font-mono-tabular">
                            {entry.number}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>سیم {toPersianDigits(entry.simSlot)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatDuration(entry.durationSec)}</span>
                        </div>
                        {entry.rejectSmsSent && (
                          <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                            پیامک سریع ارسال شد: «{entry.rejectSmsSent}»
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void onDial(entry.number, entry.contactName, entry.simSlot)}
                      aria-label={`تماس مجدد با ${entry.contactName}`}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>تماس مجدد</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
