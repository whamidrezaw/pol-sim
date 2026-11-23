import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AndroidHostPanel } from './components/AndroidHostPanel';
import { ArchitectureView } from './components/ArchitectureView';
import { CallOverlay } from './components/CallOverlay';
import { CallsView } from './components/CallsView';
import { HostStatusStrip } from './components/HostStatusStrip';
import { MessagesView } from './components/MessagesView';
import { PairingModal } from './components/PairingModal';
import { OfflineIndicator } from './components/PwaControls';
import { TopBar, type NavTab } from './components/TopBar';
import { UssdView } from './components/UssdView';
import {
  INITIAL_CALL_LOGS,
  INITIAL_CONTACTS,
  INITIAL_HOST_TELEMETRY,
  INITIAL_SMS,
  INITIAL_USSD_HISTORY,
} from './data/seedData';
import { useEncryptedBridge } from './hooks/useEncryptedBridge';
import { detectSenderCategory, extractOtp } from './lib/otp';
import { evaluateUssdCommand } from './lib/ussd';
import type {
  ActiveCallState,
  BridgeEvent,
  CallLogEntry,
  CallTier,
  HostTelemetry,
  SimSlot,
  SmsMessage,
  UssdHistoryEntry,
} from './types/bridge';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('messages');
  const [pairingOpen, setPairingOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('polsim_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const [telemetry, setTelemetry] = useState<HostTelemetry>(INITIAL_HOST_TELEMETRY);
  const [messages, setMessages] = useState<SmsMessage[]>(INITIAL_SMS);
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>(INITIAL_CALL_LOGS);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [ussdHistory, setUssdHistory] = useState<UssdHistoryEntry[]>(INITIAL_USSD_HISTORY);
  const [pendingUssdCode, setPendingUssdCode] = useState<string | null>(null);
  const [bridgeNotice, setBridgeNotice] = useState<string | null>(null);
  const [activeOtpBanner, setActiveOtpBanner] = useState<{
    messageId: string;
    code: string;
    issuer: string;
    simSlot: SimSlot;
  } | null>(() => {
    const firstOtp = INITIAL_SMS.find((m) => m.otpCode);
    if (!firstOtp || !firstOtp.otpCode) return null;
    return {
      messageId: firstOtp.id,
      code: firstOtp.otpCode,
      issuer: firstOtp.contactName,
      simSlot: firstOtp.simSlot,
    };
  });

  // Refs for latest state inside WebSocket handlers
  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;
  const activeCallRef = useRef(activeCall);
  activeCallRef.current = activeCall;
  const sendFromHostRef = useRef<(event: BridgeEvent) => Promise<boolean>>(async () => false);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('polsim_theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);

  const showTransientNotice = useCallback((text: string) => {
    setBridgeNotice(text);
    window.setTimeout(() => {
      setBridgeNotice((cur) => (cur === text ? null : cur));
    }, 4000);
  }, []);

  // Client-side receiver (iPhone Client socket receives encrypted events from Android Host)
  const handleClientReceive = useCallback((event: BridgeEvent) => {
    switch (event.type) {
      case 'sms:incoming': {
        const incoming = event.message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [incoming, ...prev];
        });
        if (incoming.otpCode) {
          setActiveOtpBanner({
            messageId: incoming.id,
            code: incoming.otpCode,
            issuer: incoming.contactName,
            simSlot: incoming.simSlot,
          });
        }
        break;
      }
      case 'sms:status_update': {
        setMessages((prev) =>
          prev.map((m) => (m.id === event.id ? { ...m, status: event.status } : m))
        );
        break;
      }
      case 'call:incoming': {
        setActiveCall(event.call);
        break;
      }
      case 'call:state_sync': {
        setActiveCall(event.activeCall);
        if (event.logEntry) {
          const entry = event.logEntry;
          setCallLogs((prev) => (prev.some((c) => c.id === entry.id) ? prev : [entry, ...prev]));
        }
        break;
      }
      case 'ussd:response': {
        setPendingUssdCode(null);
        const entry = event.entry;
        setUssdHistory((prev) => (prev.some((u) => u.id === entry.id) ? prev : [entry, ...prev]));
        break;
      }
      case 'telemetry:sync': {
        setTelemetry(event.telemetry);
        break;
      }
      default:
        break;
    }
  }, []);

  // Host-side receiver (Android Host socket receives encrypted commands from iPhone Client)
  const handleHostReceive = useCallback((event: BridgeEvent) => {
    const hostSend = sendFromHostRef.current;

    switch (event.type) {
      case 'sms:send_request': {
        const msg = event.message;
        // Record outgoing SMS on host view as well (idempotent)
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [{ ...msg, status: 'sent' }, ...prev];
        });
        void hostSend({ type: 'sms:status_update', id: msg.id, status: 'sent' });
        window.setTimeout(() => {
          void hostSend({ type: 'sms:status_update', id: msg.id, status: 'delivered' });
        }, 550);
        break;
      }
      case 'call:dial_request': {
        const t = telemetryRef.current;
        const carrierName = event.simSlot === 1 ? t.sims[0].carrier : t.sims[1].carrier;
        const audioRoute =
          t.callTier === 'level2_callkit_voip'
            ? 'callkit_voip'
            : t.multipointConnected
              ? 'multipoint_headset'
              : 'host_speaker';
        const dialing: ActiveCallState = {
          id: createId('call'),
          number: event.number,
          contactName: event.contactName,
          simSlot: event.simSlot,
          carrierName,
          state: 'dialing',
          startedAt: Date.now(),
          muted: false,
          speaker: false,
          audioRoute,
        };
        setActiveCall(dialing);
        void hostSend({ type: 'call:state_sync', activeCall: dialing });

        window.setTimeout(() => {
          const cur = activeCallRef.current;
          if (!cur || cur.id !== dialing.id) return;
          const connected: ActiveCallState = {
            ...cur,
            state: 'connected',
            connectedAt: Date.now(),
          };
          setActiveCall(connected);
          void hostSend({ type: 'call:state_sync', activeCall: connected });
        }, 900);
        break;
      }
      case 'call:action': {
        const cur = activeCallRef.current;
        if (!cur || cur.id !== event.callId) return;
        const t = telemetryRef.current;

        if (event.action === 'answer') {
          const connected: ActiveCallState = {
            ...cur,
            state: 'connected',
            connectedAt: Date.now(),
          };
          setActiveCall(connected);
          void hostSend({ type: 'call:state_sync', activeCall: connected });
          return;
        }

        if (event.action === 'mute') {
          const updated: ActiveCallState = { ...cur, muted: !cur.muted };
          setActiveCall(updated);
          void hostSend({ type: 'call:state_sync', activeCall: updated });
          return;
        }

        if (event.action === 'speaker') {
          const updated: ActiveCallState = { ...cur, speaker: !cur.speaker };
          setActiveCall(updated);
          void hostSend({ type: 'call:state_sync', activeCall: updated });
          return;
        }

        if (event.action === 'reject' || event.action === 'hangup') {
          const durationSec = cur.connectedAt
            ? Math.max(1, Math.floor((Date.now() - cur.connectedAt) / 1000))
            : 0;
          const direction =
            event.action === 'reject'
              ? 'rejected'
              : cur.state === 'ringing'
                ? 'missed'
                : cur.connectedAt
                  ? 'incoming'
                  : 'outgoing';

          const logEntry: CallLogEntry = {
            id: createId('clog'),
            number: cur.number,
            contactName: cur.contactName,
            direction,
            simSlot: cur.simSlot,
            timestamp: Date.now(),
            durationSec,
            tierUsed: t.callTier,
            rejectSmsSent: event.rejectSms,
          };

          setActiveCall(null);
          void hostSend({ type: 'call:state_sync', activeCall: null, logEntry });

          if (event.rejectSms) {
            const carrierName = cur.simSlot === 1 ? t.sims[0].carrier : t.sims[1].carrier;
            const quickSms: SmsMessage = {
              id: createId('sms'),
              address: cur.number,
              contactName: cur.contactName,
              body: event.rejectSms,
              direction: 'outgoing',
              simSlot: cur.simSlot,
              carrierName,
              timestamp: Date.now(),
              status: 'delivered',
              read: true,
              otpCode: null,
              category: 'personal',
            };
            void hostSend({ type: 'sms:incoming', message: quickSms });
          }
        }
        break;
      }
      case 'ussd:request': {
        const t = telemetryRef.current;
        const carrierName = event.simSlot === 1 ? t.sims[0].carrier : t.sims[1].carrier;
        const result = evaluateUssdCommand(event.code, event.simSlot, event.menuInput);
        const entry: UssdHistoryEntry = {
          id: createId('ussd'),
          code: event.code,
          simSlot: event.simSlot,
          carrierName,
          title: result.title,
          response: result.body,
          expectsReply: result.expectsReply,
          timestamp: Date.now(),
        };
        window.setTimeout(() => {
          void hostSend({ type: 'ussd:response', entry });
        }, 320);
        break;
      }
      case 'telemetry:command': {
        const prev = telemetryRef.current;
        let next = { ...prev, lastHeartbeat: Date.now() };
        if (event.command === 'set_call_tier' && typeof event.value === 'string') {
          next = { ...next, callTier: event.value as CallTier };
        } else if (event.command === 'set_voip_forward' && typeof event.value === 'string') {
          const [num, enabledStr] = event.value.split('|');
          next = {
            ...next,
            voipForwardNumber: num || prev.voipForwardNumber,
            forwardingEnabled: enabledStr === '1',
          };
        } else if (event.command === 'toggle_hotspot') {
          next = { ...next, hotspotEnabled: !prev.hotspotEnabled };
        } else if (event.command === 'toggle_battery_saver') {
          next = { ...next, smartBatterySaver: !prev.smartBatterySaver };
        }
        setTelemetry(next);
        void hostSend({ type: 'telemetry:sync', telemetry: next });
        break;
      }
      default:
        break;
    }
  }, []);

  const {
    state: bridge,
    setMode,
    sendFromHost,
    sendFromClient,
    rotatePairingSession,
    joinManualRoom,
    getPairingUrl,
  } = useEncryptedBridge({
    onClientReceive: handleClientReceive,
    onHostReceive: handleHostReceive,
  });

  sendFromHostRef.current = sendFromHost;

  // --- Client Actions ---
  const handleSendSms = useCallback(
    async (address: string, contactName: string, body: string, simSlot: SimSlot) => {
      if (!bridge.hostOnline) {
        showTransientNotice('گوشی میزبان اندروید آنلاین نیست. برای تست، حالت «آزمایشگاه دوگوشی» را فعال کنید.');
        return;
      }
      const carrierName = simSlot === 1 ? telemetry.sims[0].carrier : telemetry.sims[1].carrier;
      const msg: SmsMessage = {
        id: createId('sms'),
        address,
        contactName,
        body,
        direction: 'outgoing',
        simSlot,
        carrierName,
        timestamp: Date.now(),
        status: 'sending',
        read: true,
        otpCode: null,
        category: detectSenderCategory(contactName, body),
      };
      setMessages((prev) => [msg, ...prev]);
      await sendFromClient({ type: 'sms:send_request', message: msg });
    },
    [bridge.hostOnline, sendFromClient, showTransientNotice, telemetry.sims]
  );

  const handleMarkThreadRead = useCallback((address: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.address === address && !m.read ? { ...m, read: true } : m))
    );
  }, []);

  const handleDial = useCallback(
    async (number: string, contactName: string, simSlot: SimSlot) => {
      if (!bridge.hostOnline) {
        showTransientNotice('گوشی میزبان اندروید آنلاین نیست.');
        return;
      }
      await sendFromClient({ type: 'call:dial_request', number, contactName, simSlot });
    },
    [bridge.hostOnline, sendFromClient, showTransientNotice]
  );

  const handleCallAction = useCallback(
    async (action: 'answer' | 'reject' | 'hangup' | 'mute' | 'speaker', rejectSms?: string) => {
      if (!activeCall) return;
      await sendFromClient({
        type: 'call:action',
        callId: activeCall.id,
        action,
        rejectSms,
      });
    },
    [activeCall, sendFromClient]
  );

  const handleExecuteUssd = useCallback(
    async (code: string, simSlot: SimSlot, menuInput?: string) => {
      if (!bridge.hostOnline) {
        showTransientNotice('گوشی میزبان اندروید آنلاین نیست.');
        return;
      }
      setPendingUssdCode(code);
      await sendFromClient({
        type: 'ussd:request',
        id: createId('ussd-req'),
        code,
        simSlot,
        menuInput,
      });
    },
    [bridge.hostOnline, sendFromClient, showTransientNotice]
  );

  const handleSelectCallTier = useCallback(
    async (tier: CallTier) => {
      setTelemetry((prev) => ({ ...prev, callTier: tier }));
      await sendFromClient({
        type: 'telemetry:command',
        command: 'set_call_tier',
        value: tier,
      });
    },
    [sendFromClient]
  );

  const handleSendForwardingUssd = useCallback(
    async (code: string, simSlot: SimSlot, forwardNumber: string, enabled: boolean) => {
      await sendFromClient({
        type: 'telemetry:command',
        command: 'set_voip_forward',
        value: `${forwardNumber}|${enabled ? '1' : '0'}`,
      });
      await handleExecuteUssd(code, simSlot);
    },
    [handleExecuteUssd, sendFromClient]
  );

  // --- Host Actions (Android Host Gateway Panel) ---
  const handleSimulateIncomingSms = useCallback(
    async (sender: string, contactName: string, body: string, simSlot: SimSlot) => {
      const otpMatch = extractOtp(body, contactName);
      const carrierName = simSlot === 1 ? telemetry.sims[0].carrier : telemetry.sims[1].carrier;
      const incoming: SmsMessage = {
        id: createId('sms'),
        address: sender,
        contactName,
        body,
        direction: 'incoming',
        simSlot,
        carrierName,
        timestamp: Date.now(),
        status: 'received',
        read: false,
        otpCode: otpMatch?.code ?? null,
        category: detectSenderCategory(contactName, body),
      };

      if (bridge.mode === 'host') {
        setMessages((prev) => [incoming, ...prev]);
      }
      const ok = await sendFromHost({ type: 'sms:incoming', message: incoming });
      if (!ok) {
        showTransientNotice('اتصال رمزنگاری‌شده میزبان برقرار نیست.');
      }
    },
    [bridge.mode, sendFromHost, showTransientNotice, telemetry.sims]
  );

  const handleSimulateIncomingCall = useCallback(
    async (number: string, contactName: string, simSlot: SimSlot) => {
      const carrierName = simSlot === 1 ? telemetry.sims[0].carrier : telemetry.sims[1].carrier;
      const audioRoute =
        telemetry.callTier === 'level2_callkit_voip'
          ? 'callkit_voip'
          : telemetry.multipointConnected
            ? 'multipoint_headset'
            : 'host_speaker';
      const call: ActiveCallState = {
        id: createId('call'),
        number,
        contactName,
        simSlot,
        carrierName,
        state: 'ringing',
        startedAt: Date.now(),
        muted: false,
        speaker: false,
        audioRoute,
      };
      setActiveCall(call);
      await sendFromHost({ type: 'call:incoming', call });
    },
    [sendFromHost, telemetry.callTier, telemetry.multipointConnected, telemetry.sims]
  );

  const handleUpdateTelemetry = useCallback(
    async (patch: Partial<HostTelemetry>) => {
      const next: HostTelemetry = {
        ...telemetryRef.current,
        ...patch,
        lastHeartbeat: Date.now(),
      };
      setTelemetry(next);
      await sendFromHost({ type: 'telemetry:sync', telemetry: next });
    },
    [sendFromHost]
  );

  const unreadSmsCount = useMemo(
    () => messages.filter((m) => m.direction === 'incoming' && !m.read).length,
    [messages]
  );

  const missedCallsCount = useMemo(
    () => callLogs.filter((c) => c.direction === 'missed').length,
    [callLogs]
  );

  const showDualHostColumn = bridge.mode === 'dual' && activeTab !== 'architecture';

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100 md:pb-8">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenPairing={() => setPairingOpen(true)}
        unreadSmsCount={unreadSmsCount}
        missedCallsCount={missedCallsCount}
      />

      <HostStatusStrip
        telemetry={telemetry}
        bridge={bridge}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onChangeMode={setMode}
      />

      {bridgeNotice && (
        <div
          role="status"
          className="mx-auto mt-4 max-w-[1440px] px-4 md:px-6"
        >
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100">
            {bridgeNotice}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1440px] px-4 py-5 md:px-6">
        {bridge.mode === 'host' ? (
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs leading-6 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
              <strong>حالت میزبان اندروید فعال است:</strong> روی دکمه «اتصال گوشی» در بالای صفحه بزنید و کد QR را با آیفون خود اسکن کنید تا پیامک‌ها، رمزهای پویا و تماس‌های این گوشی به صورت رمزنگاری‌شده (AES-256) روی آیفون دریافت شوند.
            </div>
            <AndroidHostPanel
              telemetry={telemetry}
              bridge={bridge}
              contacts={INITIAL_CONTACTS}
              onSimulateIncomingSms={handleSimulateIncomingSms}
              onSimulateIncomingCall={handleSimulateIncomingCall}
              onUpdateTelemetry={handleUpdateTelemetry}
            />
          </div>
        ) : (
          <div className={showDualHostColumn ? 'grid items-start gap-6 xl:grid-cols-12' : ''}>
            {/* Primary iPhone Client Workspace */}
            <div className={showDualHostColumn ? 'xl:col-span-8' : ''}>
              {activeTab === 'messages' && (
                <MessagesView
                  messages={messages}
                  contacts={INITIAL_CONTACTS}
                  activeOtpBanner={activeOtpBanner}
                  onDismissOtpBanner={() => setActiveOtpBanner(null)}
                  onMarkThreadRead={handleMarkThreadRead}
                  onSendSms={handleSendSms}
                />
              )}

              {activeTab === 'calls' && (
                <CallsView
                  callLogs={callLogs}
                  contacts={INITIAL_CONTACTS}
                  telemetry={telemetry}
                  onDial={handleDial}
                  onSelectCallTier={handleSelectCallTier}
                  onSendForwardingUssd={handleSendForwardingUssd}
                />
              )}

              {activeTab === 'ussd' && (
                <UssdView
                  history={ussdHistory}
                  pendingCode={pendingUssdCode}
                  onExecuteUssd={handleExecuteUssd}
                />
              )}

              {activeTab === 'architecture' && <ArchitectureView />}
            </div>

            {/* Companion Live Android Host Gateway Panel (in Dual Sandbox mode) */}
            {showDualHostColumn && (
              <div className="xl:col-span-4">
                <AndroidHostPanel
                  telemetry={telemetry}
                  bridge={bridge}
                  contacts={INITIAL_CONTACTS}
                  onSimulateIncomingSms={handleSimulateIncomingSms}
                  onSimulateIncomingCall={handleSimulateIncomingCall}
                  onUpdateTelemetry={handleUpdateTelemetry}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <CallOverlay
        activeCall={activeCall}
        headsetName={telemetry.multipointHeadsetName}
        onAnswer={() => void handleCallAction('answer')}
        onReject={(rejectSms) => void handleCallAction('reject', rejectSms)}
        onHangup={() => void handleCallAction('hangup')}
        onToggleMute={() => void handleCallAction('mute')}
        onToggleSpeaker={() => void handleCallAction('speaker')}
      />

      <PairingModal
        open={pairingOpen}
        onClose={() => setPairingOpen(false)}
        bridge={bridge}
        pairingUrl={getPairingUrl('client')}
        onRotateSession={rotatePairingSession}
        onChangeMode={setMode}
        onJoinManual={joinManualRoom}
      />

      <OfflineIndicator />
    </div>
  );
}
