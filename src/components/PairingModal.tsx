import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Lock, RefreshCw, Smartphone, X } from 'lucide-react';
import type { BridgeConnectionState } from '../hooks/useEncryptedBridge';
import type { DeviceMode } from '../types/bridge';

interface PairingModalProps {
  open: boolean;
  onClose: () => void;
  bridge: BridgeConnectionState;
  pairingUrl: string;
  onRotateSession: () => Promise<void>;
  onChangeMode: (mode: DeviceMode) => void;
  onJoinManual: (room: string, key: string, role: DeviceMode) => boolean;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  open,
  onClose,
  bridge,
  pairingUrl,
  onRotateSession,
  onChangeMode,
  onJoinManual,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [manualRoom, setManualRoom] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [manualRole, setManualRole] = useState<DeviceMode>('client');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !pairingUrl) return;
    QRCode.toDataURL(pairingUrl, {
      width: 220,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [open, pairingUrl]);

  if (!open) return null;

  const handleCopyLink = async () => {
    if (!pairingUrl) return;
    try {
      await navigator.clipboard.writeText(pairingUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleaned = manualRoom.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      setFormError('کد اتاق باید دقیقاً ۶ رقم باشد.');
      return;
    }
    if (manualKey.trim().length < 24) {
      setFormError('کلید E2EE معتبر وارد کنید.');
      return;
    }
    const ok = onJoinManual(cleaned, manualKey.trim(), manualRole);
    if (ok) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pairing-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 id="pairing-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
              جفت‌سازی امن ۱ به ۱ (اندروید ← آیفون)
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              کلید رمزنگاری AES-256-GCM تنها در بخش Hash لینک قرار می‌گیرد و هرگز به سرور ارسال نمی‌شود.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره جفت‌سازی"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {/* QR & Current Session */}
          <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl bg-white p-2 shadow-xs">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="کد QR جفت‌سازی امن برای اسکن با دوربین آیفون"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400">در حال ساخت QR...</span>
              )}
            </div>

            <div className="mt-4 w-full space-y-2 text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">کد اتاق جفت‌سازی</div>
              <div dir="ltr" className="font-mono-tabular text-2xl font-bold tracking-widest text-slate-900 dark:text-white">
                {bridge.roomCode ? `${bridge.roomCode.slice(0, 3)}-${bridge.roomCode.slice(3)}` : '---'}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>اثر انگشت کلید:</span>
                <span dir="ltr" className="font-mono-tabular font-semibold">
                  {bridge.keyFingerprint}
                </span>
              </div>
            </div>

            <div className="mt-4 flex w-full gap-2">
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedLink ? 'لینک کپی شد' : 'کپی لینک آیفون'}</span>
              </button>
              <button
                type="button"
                onClick={() => void onRotateSession()}
                aria-label="تولید کلید و کد جفت‌سازی جدید"
                className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>کلید جدید</span>
              </button>
            </div>
          </div>

          {/* Device Role & Manual Join */}
          <div className="flex flex-col justify-between space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                نقش این دستگاه
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                برای تست فوری هر دو گوشی کنار هم از «آزمایشگاه دوگوشی» استفاده کنید، یا روی گوشی واقعی نقش آن را انتخاب کنید.
              </p>

              <div className="mt-3 space-y-2">
                {(
                  [
                    {
                      id: 'dual',
                      title: 'آزمایشگاه دوگوشی همزمان',
                      desc: 'نمایش کلاینت آیفون و دروازه اندروید در کنار هم با اتصال زنده رمزنگاری‌شده',
                    },
                    {
                      id: 'client',
                      title: 'فقط کلاینت آیفون (گیرنده)',
                      desc: 'رابط اختصاصی آیفون برای دریافت پیامک، رمز پویا، تماس و USSD',
                    },
                    {
                      id: 'host',
                      title: 'فقط میزبان اندروید (دروازه سیم‌کارت)',
                      desc: 'کنسول گوشی اندرویدی متصل به سیم‌کارت‌های همراه اول و ایرانسل',
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeMode(item.id)}
                    className={`w-full rounded-xl border p-3 text-right transition-colors ${
                      bridge.mode === item.id
                        ? 'border-blue-600 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/30'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                      <Smartphone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleManualSubmit}
              className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800"
            >
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                اتصال دستی به اتاق دستگاه دیگر
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="manual-room" className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    کد اتاق ۶ رقمی
                  </label>
                  <input
                    id="manual-room"
                    type="text"
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={6}
                    value={manualRoom}
                    onChange={(e) => setManualRoom(e.target.value)}
                    placeholder="482915"
                    className="font-mono-tabular w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="manual-role" className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    نقش هنگام اتصال
                  </label>
                  <select
                    id="manual-role"
                    value={manualRole}
                    onChange={(e) => setManualRole(e.target.value as DeviceMode)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="client">ورود به عنوان آیفون</option>
                    <option value="host">ورود به عنوان اندروید</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="manual-key" className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  کلید امنیتی E2EE (بخش #k= در لینک)
                </label>
                <input
                  id="manual-key"
                  type="text"
                  dir="ltr"
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  placeholder="Base64URL E2EE Key"
                  className="font-mono-tabular w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              {(formError || bridge.pairingError) && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                  {formError || bridge.pairingError}
                </p>
              )}
              <button
                type="submit"
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                برقراری اتصال دستی
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
