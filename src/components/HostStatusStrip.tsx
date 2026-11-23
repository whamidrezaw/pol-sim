import React from 'react';
import {
  BatteryCharging,
  BatteryMedium,
  Bluetooth,
  Moon,
  ShieldCheck,
  Signal,
  Smartphone,
  Sun,
  Wifi,
} from 'lucide-react';
import type { BridgeConnectionState } from '../hooks/useEncryptedBridge';
import type { DeviceMode, HostTelemetry } from '../types/bridge';
import { toPersianDigits } from '../lib/otp';
import { PWAInstallButton } from './PwaControls';

interface HostStatusStripProps {
  telemetry: HostTelemetry;
  bridge: BridgeConnectionState;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onChangeMode: (mode: DeviceMode) => void;
}

const TRANSPORT_LABELS: Record<HostTelemetry['transportLayer'], string> = {
  ble_wake: 'BLE کم‌مصرف',
  wifi_tls: 'Wi-Fi محلی TLS 1.3',
  e2ee_relay: 'رله رمزنگاری‌شده E2EE',
};

export const HostStatusStrip: React.FC<HostStatusStripProps> = ({
  telemetry,
  bridge,
  darkMode,
  onToggleDarkMode,
  onChangeMode,
}) => {
  const paired = bridge.hostOnline && bridge.clientOnline;
  const batteryColor =
    telemetry.batteryPercent <= 20
      ? 'text-red-600 dark:text-red-400'
      : telemetry.batteryPercent <= 40
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-700 dark:text-emerald-400';

  return (
    <section
      aria-label="وضعیت زنده گوشی میزبان و اتصال رمزنگاری‌شده"
      className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827]"
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-2.5 md:px-6">
        {/* Live Host Telemetry (clean unboxed metadata separated by typographic dots) */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5 font-medium whitespace-nowrap">
            <ShieldCheck
              className={`h-4 w-4 shrink-0 ${
                paired ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}
              aria-hidden="true"
            />
            <span className={paired ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
              {paired ? 'جفت‌شده (AES-256)' : bridge.wsConnected ? 'در انتظار دستگاه دوم' : 'در حال اتصال...'}
            </span>
          </div>

          <span className="hidden text-slate-300 dark:text-slate-700 sm:inline" aria-hidden="true">·</span>

          <div className="hidden items-center gap-1.5 sm:flex whitespace-nowrap">
            <Smartphone className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <bdi className="font-medium text-slate-800 dark:text-slate-200">{telemetry.deviceModel}</bdi>
          </div>

          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>

          <div className={`flex items-center gap-1 font-medium tabular-nums whitespace-nowrap ${batteryColor}`}>
            {telemetry.isCharging ? (
              <BatteryCharging className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <BatteryMedium className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>باتری {toPersianDigits(telemetry.batteryPercent)}٪</span>
          </div>

          <span className="hidden text-slate-300 dark:text-slate-700 xl:inline" aria-hidden="true">·</span>

          <div className="hidden items-center gap-1.5 xl:flex whitespace-nowrap">
            <Signal className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <span>
              {telemetry.sims[0].carrier} {telemetry.sims[0].networkType}
            </span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">/</span>
            <span>
              {telemetry.sims[1].carrier} {telemetry.sims[1].networkType}
            </span>
          </div>

          <span className="hidden text-slate-300 dark:text-slate-700 2xl:inline" aria-hidden="true">·</span>

          <div className="hidden items-center gap-1.5 2xl:flex whitespace-nowrap">
            {telemetry.hotspotEnabled ? (
              <Wifi className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
            ) : (
              <Bluetooth className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            )}
            <span>
              {TRANSPORT_LABELS[telemetry.transportLayer]}
            </span>
          </div>
        </div>

        {/* Workspace Mode Segmented Switcher (desktop) + Utility Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="حالت نمایش دستگاه"
            className="hidden md:flex items-center gap-0.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/90"
          >
            {(
              [
                { id: 'dual', label: 'آزمایشگاه دوگوشی' },
                { id: 'client', label: 'کلاینت آیفون' },
                { id: 'host', label: 'میزبان اندروید' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeMode(opt.id)}
                className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  bridge.mode === opt.id
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <PWAInstallButton />

          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 shrink-0"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </section>
  );
};
