import React, { useState } from 'react';
import {
  BatteryCharging,
  Check,
  Copy,
  Lock,
  PhoneIncoming,
  Send,
  Smartphone,
  Wifi,
  Zap,
} from 'lucide-react';
import { HOST_SIMULATION_PRESETS } from '../data/seedData';
import type { BridgeConnectionState } from '../hooks/useEncryptedBridge';
import type { ContactItem, HostTelemetry, SimSlot, TransportLayer } from '../types/bridge';
import { toPersianDigits } from '../lib/otp';

interface AndroidHostPanelProps {
  telemetry: HostTelemetry;
  bridge: BridgeConnectionState;
  contacts: ContactItem[];
  onSimulateIncomingSms: (sender: string, contactName: string, body: string, simSlot: SimSlot) => Promise<void>;
  onSimulateIncomingCall: (number: string, contactName: string, simSlot: SimSlot) => Promise<void>;
  onUpdateTelemetry: (patch: Partial<HostTelemetry>) => Promise<void>;
}

export const AndroidHostPanel: React.FC<AndroidHostPanelProps> = ({
  telemetry,
  bridge,
  contacts,
  onSimulateIncomingSms,
  onSimulateIncomingCall,
  onUpdateTelemetry,
}) => {
  const [customSender, setCustomSender] = useState('BankSaman');
  const [customBody, setCustomBody] = useState('');
  const [customSim, setCustomSim] = useState<SimSlot>(1);
  const [customError, setCustomError] = useState<string | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  const handleCustomSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);
    if (!customSender.trim() || !customBody.trim()) {
      setCustomError('نام فرستنده و متن پیامک را وارد کنید.');
      return;
    }
    await onSimulateIncomingSms(customSender.trim(), customSender.trim(), customBody.trim(), customSim);
    setCustomBody('');
  };

  const handleCopyHotspot = async () => {
    try {
      await navigator.clipboard.writeText(telemetry.hotspotPassword);
    } catch {
      // ignore in restricted environments
    }
    setCopiedPass(true);
    window.setTimeout(() => setCopiedPass(false), 1800);
  };

  return (
    <aside
      aria-label="دروازه میزبان اندروید"
      className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]"
    >
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              دروازه میزبان اندروید (Host)
            </h2>
          </div>
          <span className="tabular-nums text-[11px] font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
            {toPersianDigits(bridge.encryptedPackets)} بسته رمزنگاری‌شده
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {telemetry.deviceModel} · {telemetry.androidVersion}
          {bridge.lastLatencyMs !== null ? ` · تأخیر ${toPersianDigits(bridge.lastLatencyMs)} میلی‌ثانیه` : ''}
        </p>
      </div>

      {/* Quick Incoming Bank OTP / SMS Triggers */}
      <div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-white">
          شبیه‌سازی دریافت پیامک روی سیم‌کارت اندروید
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          با کلیک روی هر گزینه، پیامک با AES-256 رمزنگاری و از طریق WebSocket به آیفون ارسال می‌شود.
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {HOST_SIMULATION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                void onSimulateIncomingSms(
                  preset.sender,
                  preset.contactName,
                  preset.body(),
                  preset.simSlot
                )
              }
              className="min-h-[42px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs font-medium text-slate-800 transition-colors hover:border-blue-400 hover:bg-blue-50/60 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:border-blue-600"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => void handleCustomSms(e)} className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              aria-label="فرستنده پیامک آزمایشی"
              value={customSender}
              onChange={(e) => setCustomSender(e.target.value)}
              placeholder="فرستنده"
              className="col-span-2 min-h-[38px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <select
              aria-label="سیم‌کارت دریافت‌کننده"
              value={customSim}
              onChange={(e) => setCustomSim(Number(e.target.value) as SimSlot)}
              className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value={1}>سیم ۱</option>
              <option value={2}>سیم ۲</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              aria-label="متن پیامک آزمایشی برای ارسال از اندروید"
              value={customBody}
              onChange={(e) => {
                setCustomBody(e.target.value);
                if (customError) setCustomError(null);
              }}
              placeholder="متن دلخواه (مثلاً رمز پویا: 924180)..."
              className="min-h-[38px] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <button
              type="submit"
              aria-label="ارسال پیامک آزمایشی به آیفون"
              className="inline-flex min-h-[38px] items-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          {customError && (
            <p role="alert" className="text-[11px] text-red-600 dark:text-red-400">
              {customError}
            </p>
          )}
        </form>
      </div>

      {/* Incoming Call Trigger */}
      <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white">
          شبیه‌سازی تماس ورودی روی اندروید
        </h3>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {contacts.slice(0, 2).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void onSimulateIncomingCall(c.number, c.name, c.preferredSim)}
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <PhoneIncoming className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">تماس از {c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live Host Hardware & Hotspot Controls */}
      <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white">
          کنترل سخت‌افزار و لایه ارتباطی میزبان
        </h3>

        {/* Transport Layer */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {(
            [
              { id: 'ble_wake', label: 'BLE بیدارباش' },
              { id: 'wifi_tls', label: 'Wi-Fi محلی' },
              { id: 'e2ee_relay', label: 'رله ابری' },
            ] as Array<{ id: TransportLayer; label: string }>
          ).map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => void onUpdateTelemetry({ transportLayer: layer.id })}
              className={`min-h-[34px] rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                telemetry.transportLayer === layer.id
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>

        {/* Battery Slider + Charging */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="host-battery-slider" className="text-slate-600 dark:text-slate-300">
              سطح باتری اندروید: <strong className="tabular-nums">{toPersianDigits(telemetry.batteryPercent)}٪</strong>
            </label>
            <button
              type="button"
              onClick={() => void onUpdateTelemetry({ isCharging: !telemetry.isCharging })}
              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                telemetry.isCharging ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'
              }`}
            >
              <BatteryCharging className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{telemetry.isCharging ? 'در حال شارژ' : 'بدون شارژر'}</span>
            </button>
          </div>
          <input
            id="host-battery-slider"
            type="range"
            min={5}
            max={100}
            value={telemetry.batteryPercent}
            onChange={(e) => void onUpdateTelemetry({ batteryPercent: Number(e.target.value) })}
            className="w-full accent-blue-700"
          />
        </div>

        {/* Hotspot Wi-Fi + Smart Battery Saver */}
        <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
              <Wifi className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              <span>هات‌اسپات 5G ({telemetry.hotspotSsid})</span>
            </div>
            <button
              type="button"
              onClick={() =>
                void onUpdateTelemetry({
                  hotspotEnabled: !telemetry.hotspotEnabled,
                  transportLayer: !telemetry.hotspotEnabled ? 'wifi_tls' : 'ble_wake',
                })
              }
              className={`min-h-[32px] rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                telemetry.hotspotEnabled
                  ? 'bg-blue-700 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              {telemetry.hotspotEnabled ? 'روشن' : 'خاموش'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              رمز هات‌اسپات: <span dir="ltr" className="font-mono-tabular font-semibold text-slate-700 dark:text-slate-200">{telemetry.hotspotPassword}</span>
            </span>
            <button
              type="button"
              onClick={() => void handleCopyHotspot()}
              className="inline-flex items-center gap-1 text-blue-700 hover:underline dark:text-blue-400"
            >
              {copiedPass ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>{copiedPass ? 'کپی شد' : 'کپی رمز'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Zap className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              <span>مدیریت هوشمند باتری (خواب خودکار Wi-Fi)</span>
            </div>
            <button
              type="button"
              onClick={() =>
                void onUpdateTelemetry({ smartBatterySaver: !telemetry.smartBatterySaver })
              }
              className={`min-h-[30px] rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                telemetry.smartBatterySaver
                  ? 'bg-emerald-700 text-white'
                  : 'border border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {telemetry.smartBatterySaver ? 'فعال' : 'غیرفعال'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Lock className="h-3 w-3 text-emerald-600" aria-hidden="true" />
            اثر انگشت E2EE:
          </span>
          <span dir="ltr" className="font-mono-tabular font-semibold text-slate-700 dark:text-slate-300">
            {bridge.keyFingerprint}
          </span>
        </div>
      </div>
    </aside>
  );
};
