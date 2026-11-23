import React, { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  KOTLIN_GATEWAY_SNIPPET,
  PHASE0_FEASIBILITY_ITEMS,
  SWIFT_CLIENT_SNIPPET,
} from '../data/seedData';
import { toPersianDigits } from '../lib/otp';

const STORAGE_KEY = 'polsim_phase0_checks_v1';

const COMPARISON_ROWS = [
  {
    feature: 'اشتراک اینترنت پرسرعت (4G/5G)',
    androidToIphone: 'هات‌اسپات Wi-Fi (کامل و پایدار)',
    iphoneToIphone: 'Personal Hotspot (کامل)',
  },
  {
    feature: 'دریافت آنی پیامک و رمز پویا (OTP)',
    androidToIphone: 'کامل و لحظه‌ای (دوسیم‌کارته)',
    iphoneToIphone: 'غیرممکن (قفل Sandbox اپل)',
  },
  {
    feature: 'ارسال پیامک از شماره سیم‌کارت',
    androidToIphone: 'کامل با انتخاب سیم ۱ یا ۲',
    iphoneToIphone: 'غیرممکن',
  },
  {
    feature: 'اجرای کدهای دستوری USSD (*1#, *100#)',
    androidToIphone: 'کامل (Android API 26+)',
    iphoneToIphone: 'غیرممکن',
  },
  {
    feature: 'نمایش تماس ورودی + پاسخ / رد با پیامک',
    androidToIphone: 'کامل + ترکیب Multipoint یا دایورت CallKit',
    iphoneToIphone: 'غیرممکن برای اپ ثالث',
  },
  {
    feature: 'انتقال مستقیم صدای مکالمه با بلوتوث خام',
    androidToIphone: 'مسدود در iOS و اندروید ۱۰+ (حل‌شده با ۳ سطح)',
    iphoneToIphone: 'مسدود',
  },
];

export const ArchitectureView: React.FC = () => {
  const [checkedIds, setCheckedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as string[]) : ['p0-sms'];
    } catch {
      return ['p0-sms'];
    }
  });
  const [activeCodeTab, setActiveCodeTab] = useState<'kotlin' | 'swift'>('kotlin');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedIds));
    } catch {
      // ignore storage restrictions
    }
  }, [checkedIds]);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopySnippet = async () => {
    const text = activeCodeTab === 'kotlin' ? KOTLIN_GATEWAY_SNIPPET : SWIFT_CLIENT_SNIPPET;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Architectural Reality Matrix */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          معماری نهایی پل ارتباطی شخصی (بدون دستکاری IMEI)
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          تمرکز ۱۰۰ درصدی معماری روی مدل <strong>اندروید (میزبان سیم‌کارت) ← آیفون (کلاینت)</strong> است؛ با لایه ارتباطی سه‌گانه (BLE بیدارباش + Wi-Fi محلی TLS 1.3 + رله اختیاری E2EE) و اصل بدون سرور (Zero-Cloud) برای حداکثر امنیت رمزهای بانکی.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-3 pl-4 font-semibold">قابلیت کلیدی</th>
                <th className="py-3 px-4 font-semibold text-blue-700 dark:text-blue-400">
                  میزبان: اندروید ← کلاینت: آیفون
                </th>
                <th className="py-3 pr-4 font-semibold">میزبان: آیفون ← کلاینت: آیفون</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="py-3 pl-4 font-medium text-slate-900 dark:text-white">
                    {row.feature}
                  </td>
                  <td className="py-3 px-4 font-medium text-emerald-700 dark:text-emerald-400">
                    {row.androidToIphone}
                  </td>
                  <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">
                    {row.iphoneToIphone}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Honest Strengths vs Critical Risks */}
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            نقاط قوت کلیدی
          </h2>
          <ul className="mt-3 space-y-2.5 text-xs leading-6 text-slate-600 dark:text-slate-300">
            <li>
              <strong>جایگزین نرم‌افزاری دانگل‌های سخت‌افزاری:</strong> بسیار پایدارتر و ارزان‌تر از دستگاه‌هایی مثل iKos و بدون نیاز به هزینه‌های سنگین رجیستری.
            </li>
            <li>
              <strong>هسته فنی استاندارد و شفاف:</strong> هیچ دستکاری در IMEI یا شبکه مخابراتی وجود ندارد و جفت‌سازی صرفاً شخصی (۱ به ۱) است.
            </li>
            <li>
              <strong>امنیت رمزهای بانکی (Zero-Cloud):</strong> در حالت شبکه محلی یا E2EE، حتی سرور رله هم به متن رمز پویا دسترسی ندارد.
            </li>
            <li>
              <strong>ارزش فوری از نسخه اول:</strong> همین نسخه اول (پیامک دوطرفه + کپی خودکار OTP + USSD + کنترلر تماس) ۸۰٪ نیاز روزمره کاربران را حل می‌کند.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            ریسک‌های بحرانی و راهکار مهندسی
          </h2>
          <ul className="mt-3 space-y-2.5 text-xs leading-6 text-slate-600 dark:text-slate-300">
            <li>
              <strong>بستن اپ در پس‌زمینه (iOS و One UI):</strong> راهکار استفاده از Foreground Service با معافیت باتری در اندروید و BLE Background Wake / PushKit در آیفون است.
            </li>
            <li>
              <strong>انتشار نسخه iOS:</strong> هویت اپلیکیشن باید «همگام‌سازی پیامک و ارتباط بین دستگاه‌های شخصی» باشد و از طریق TestFlight، مارکت‌های ایرانی iOS یا PWA عرضه شود.
            </li>
            <li>
              <strong>مجوزهای SMS در اندروید:</strong> به دلیل سخت‌گیری Google Play روی READ_SMS، انتشار از طریق APK مستقیم، کافه‌بازار یا مایکت انجام می‌شود.
            </li>
            <li>
              <strong>حمل همزمان دو گوشی:</strong> با مدیریت هوشمند خاموش/روشن کردن هات‌اسپات و تکیه روی BLE کم‌مصرف، شارژ گوشی اندرویدی در کیف یک روز کامل دوام می‌آورد.
            </li>
          </ul>
        </section>
      </div>

      {/* Section 3: Interactive Phase 0 Feasibility Checklist + Native Code */}
      <div className="grid gap-5 lg:grid-cols-12">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827] lg:col-span-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                چک‌لیست تست‌های اثبات فنی (فاز ۰)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                پیش از انتشار نسخه نیتیو، این ۵ تست را روی گوشی اندروید و آیفون واقعی خود علامت بزنید.
              </p>
            </div>
            <span className="font-mono-tabular text-xs font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
              {toPersianDigits(checkedIds.length)} از {toPersianDigits(PHASE0_FEASIBILITY_ITEMS.length)}
            </span>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {PHASE0_FEASIBILITY_ITEMS.map((item) => {
              const checked = checkedIds.includes(item.id);
              return (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-3 py-3"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCheck(item.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <div>
                    <div
                      className={`text-xs font-semibold ${
                        checked
                          ? 'text-slate-400 line-through dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {item.target} · معیار: {item.criteria}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827] lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              کد پایه ماژول نیتیو (متصل به پروتکل پُل‌سیم)
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveCodeTab('kotlin')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    activeCodeTab === 'kotlin'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Kotlin (اندروید)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab('swift')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    activeCodeTab === 'swift'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Swift (آیفون)
                </button>
              </div>
              <button
                type="button"
                onClick={() => void handleCopySnippet()}
                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCode ? 'کپی شد' : 'کپی'}</span>
              </button>
            </div>
          </div>

          <pre
            dir="ltr"
            className="font-mono-tabular mt-4 flex-1 overflow-x-auto rounded-xl bg-slate-950 p-4 text-left text-[11px] leading-6 text-slate-100"
          >
            <code>{activeCodeTab === 'kotlin' ? KOTLIN_GATEWAY_SNIPPET : SWIFT_CLIENT_SNIPPET}</code>
          </pre>
        </section>
      </div>
    </div>
  );
};
