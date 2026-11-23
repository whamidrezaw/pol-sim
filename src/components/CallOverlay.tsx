import React, { useEffect, useState } from 'react';
import {
  Headphones,
  MessageSquareText,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { QUICK_REJECT_TEMPLATES } from '../data/seedData';
import { toPersianDigits } from '../lib/otp';
import type { ActiveCallState } from '../types/bridge';

interface CallOverlayProps {
  activeCall: ActiveCallState | null;
  headsetName: string | null;
  onAnswer: () => void;
  onReject: (rejectSms?: string) => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  activeCall,
  headsetName,
  onAnswer,
  onReject,
  onHangup,
  onToggleMute,
  onToggleSpeaker,
}) => {
  const [showTemplates, setShowTemplates] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!activeCall || activeCall.state !== 'connected' || !activeCall.connectedAt) {
      setElapsedSec(0);
      return;
    }
    const update = () => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - (activeCall.connectedAt || Date.now())) / 1000)));
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [activeCall]);

  useEffect(() => {
    setShowTemplates(false);
  }, [activeCall?.id]);

  if (!activeCall) return null;

  const isRinging = activeCall.state === 'ringing';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isRinging ? 'تماس ورودی از گوشی میزبان' : 'تماس فعال'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {isRinging ? 'تماس ورودی روی گوشی اندروید' : activeCall.state === 'dialing' ? 'در حال شماره‌گیری از میزبان...' : 'مکالمه برقرار است'}
            {' · '}
            {activeCall.carrierName} (سیم {toPersianDigits(activeCall.simSlot)})
          </p>

          <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {activeCall.contactName}
          </h2>
          <p dir="ltr" className="font-mono-tabular mt-1 text-sm text-slate-500 dark:text-slate-400">
            {activeCall.number}
          </p>

          {activeCall.state === 'connected' && (
            <p className="font-mono-tabular mt-2 text-lg font-semibold text-emerald-700 dark:text-emerald-400">
              {formatDuration(elapsedSec)}
            </p>
          )}

          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
            <Headphones className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <span>
              {activeCall.audioRoute === 'callkit_voip' ? (
                'مسیر صدا: دایورت VoIP روی Apple CallKit'
              ) : activeCall.audioRoute === 'multipoint_headset' && headsetName ? (
                <>
                  مسیر صدا: هندزفری دوکاره <bdi className="font-semibold">{headsetName}</bdi>
                </>
              ) : (
                'مسیر صدا: بلندگوی گوشی میزبان اندروید'
              )}
            </span>
          </div>
        </div>

        {isRinging ? (
          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onAnswer}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                <span>پاسخ</span>
              </button>
              <button
                type="button"
                onClick={() => onReject()}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                <PhoneOff className="h-4 w-4" aria-hidden="true" />
                <span>رد تماس</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowTemplates((s) => !s)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <MessageSquareText className="h-4 w-4" aria-hidden="true" />
              <span>رد تماس با پیامک سریع</span>
            </button>

            {showTemplates && (
              <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                {QUICK_REJECT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => onReject(tpl)}
                    className="w-full min-h-[44px] rounded-lg border border-slate-200 px-3 py-2 text-right text-xs text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onToggleMute}
                aria-pressed={activeCall.muted}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeCall.muted
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {activeCall.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                <span>{activeCall.muted ? 'میکروفون قطع' : 'بی‌صدا'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleSpeaker}
                aria-pressed={activeCall.speaker}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeCall.speaker
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {activeCall.speaker ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                <span>{activeCall.speaker ? 'بلندگو روشن' : 'بلندگو'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onHangup}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              <PhoneOff className="h-4 w-4" aria-hidden="true" />
              <span>پایان تماس</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
