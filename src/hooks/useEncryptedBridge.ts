import { useCallback, useEffect, useRef, useState } from 'react';
import {
  computeKeyFingerprint,
  decryptBridgePayload,
  encryptBridgePayload,
  generateE2eeKey,
  generateRoomCode,
} from '../lib/crypto';
import type { BridgeEvent, DeviceMode, EncryptedEnvelope } from '../types/bridge';

interface UseEncryptedBridgeOptions {
  onClientReceive: (event: BridgeEvent) => void;
  onHostReceive: (event: BridgeEvent) => void;
}

export interface BridgeConnectionState {
  mode: DeviceMode;
  roomCode: string;
  e2eeKey: string;
  keyFingerprint: string;
  hostOnline: boolean;
  clientOnline: boolean;
  wsConnected: boolean;
  encryptedPackets: number;
  lastLatencyMs: number | null;
  pairingError: string | null;
}

function getWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/bridge`;
}

export function useEncryptedBridge({
  onClientReceive,
  onHostReceive,
}: UseEncryptedBridgeOptions) {
  const [mode, setMode] = useState<DeviceMode>('dual');
  const [roomCode, setRoomCode] = useState<string>('');
  const [e2eeKey, setE2eeKey] = useState<string>('');
  const [keyFingerprint, setKeyFingerprint] = useState<string>('----');
  const [hostOnline, setHostOnline] = useState(false);
  const [clientOnline, setClientOnline] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [encryptedPackets, setEncryptedPackets] = useState(0);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [pairingError, setPairingError] = useState<string | null>(null);

  const clientWsRef = useRef<WebSocket | null>(null);
  const hostWsRef = useRef<WebSocket | null>(null);
  const onClientReceiveRef = useRef(onClientReceive);
  const onHostReceiveRef = useRef(onHostReceive);
  onClientReceiveRef.current = onClientReceive;
  onHostReceiveRef.current = onHostReceive;

  // Bootstrap initial pairing credentials (from URL invite or freshly generated)
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get('role');
      const urlRoom = params.get('room');
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const hashKey = hashParams.get('k');

      let initialMode: DeviceMode = 'dual';
      if (urlRole === 'client' || urlRole === 'host') {
        initialMode = urlRole;
      }

      const initialRoom = urlRoom && /^\d{6}$/.test(urlRoom) ? urlRoom : generateRoomCode();
      const initialKey = hashKey && hashKey.length >= 32 ? hashKey : await generateE2eeKey();
      const fp = await computeKeyFingerprint(initialKey);

      if (!cancelled) {
        setMode(initialMode);
        setRoomCode(initialRoom);
        setE2eeKey(initialKey);
        setKeyFingerprint(fp);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Recompute fingerprint whenever E2EE key changes
  useEffect(() => {
    if (!e2eeKey) return;
    computeKeyFingerprint(e2eeKey)
      .then(setKeyFingerprint)
      .catch(() => setKeyFingerprint('----'));
  }, [e2eeKey]);

  // Connect live WebSocket(s) according to active DeviceMode
  useEffect(() => {
    if (!roomCode || !e2eeKey) return;

    let disposed = false;
    let reconnectTimer: number | null = null;

    const cleanupSockets = () => {
      if (clientWsRef.current) {
        clientWsRef.current.onclose = null;
        clientWsRef.current.close();
        clientWsRef.current = null;
      }
      if (hostWsRef.current) {
        hostWsRef.current.onclose = null;
        hostWsRef.current.close();
        hostWsRef.current = null;
      }
    };

    const openRoleSocket = (role: 'host' | 'client') => {
      const ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        if (disposed) {
          ws.close();
          return;
        }
        setWsConnected(true);
        setPairingError(null);
        ws.send(JSON.stringify({ type: 'join', room: roomCode, role }));
      };

      ws.onmessage = async (evt) => {
        try {
          const msg = JSON.parse(String(evt.data));
          if (msg.type === 'presence') {
            setHostOnline(Boolean(msg.hostOnline));
            setClientOnline(Boolean(msg.clientOnline));
            return;
          }
          if (msg.type === 'error') {
            setPairingError(String(msg.message || 'خطای اتصال پل ارتباطی'));
            return;
          }
          if (msg.type === 'relay' && msg.envelope) {
            const env = msg.envelope as EncryptedEnvelope;
            const decrypted = await decryptBridgePayload<BridgeEvent>(e2eeKey, env);
            setEncryptedPackets((c) => c + 1);
            if (typeof msg.sentAt === 'number') {
              setLastLatencyMs(Math.max(1, Date.now() - msg.sentAt));
            }
            if (role === 'client') {
              onClientReceiveRef.current(decrypted);
            } else {
              onHostReceiveRef.current(decrypted);
            }
          }
        } catch {
          setPairingError('کلید رمزنگاری E2EE بین دو دستگاه تطابق ندارد. لطفاً مجدداً جفت‌سازی کنید.');
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        setWsConnected(false);
        if (reconnectTimer === null) {
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            if (!disposed) {
              connectAll();
            }
          }, 1800);
        }
      };

      if (role === 'client') {
        clientWsRef.current = ws;
      } else {
        hostWsRef.current = ws;
      }
    };

    const connectAll = () => {
      cleanupSockets();
      if (mode === 'dual') {
        openRoleSocket('host');
        openRoleSocket('client');
      } else if (mode === 'client') {
        openRoleSocket('client');
      } else {
        openRoleSocket('host');
      }
    };

    connectAll();

    return () => {
      disposed = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      cleanupSockets();
    };
  }, [mode, roomCode, e2eeKey]);

  const sendFromHost = useCallback(
    async (event: BridgeEvent) => {
      const ws = hostWsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || !e2eeKey) return false;
      const envelope = await encryptBridgePayload(e2eeKey, event);
      ws.send(JSON.stringify({ type: 'relay', sentAt: Date.now(), envelope }));
      setEncryptedPackets((c) => c + 1);
      return true;
    },
    [e2eeKey]
  );

  const sendFromClient = useCallback(
    async (event: BridgeEvent) => {
      const ws = clientWsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || !e2eeKey) return false;
      const envelope = await encryptBridgePayload(e2eeKey, event);
      ws.send(JSON.stringify({ type: 'relay', sentAt: Date.now(), envelope }));
      setEncryptedPackets((c) => c + 1);
      return true;
    },
    [e2eeKey]
  );

  const rotatePairingSession = useCallback(async () => {
    const nextRoom = generateRoomCode();
    const nextKey = await generateE2eeKey();
    setRoomCode(nextRoom);
    setE2eeKey(nextKey);
    setPairingError(null);
  }, []);

  const joinManualRoom = useCallback(
    (targetRoom: string, targetKey: string, targetRole: DeviceMode) => {
      const cleanedRoom = targetRoom.replace(/\D/g, '');
      if (!/^\d{6}$/.test(cleanedRoom)) {
        setPairingError('کد اتاق جفت‌سازی باید دقیقاً ۶ رقم باشد.');
        return false;
      }
      if (!targetKey || targetKey.trim().length < 24) {
        setPairingError('کلید امنیتی E2EE معتبر وارد کنید یا QR Code را اسکن نمایید.');
        return false;
      }
      setPairingError(null);
      setRoomCode(cleanedRoom);
      setE2eeKey(targetKey.trim());
      setMode(targetRole);
      return true;
    },
    []
  );

  const getPairingUrl = useCallback(
    (targetRole: 'client' | 'host') => {
      if (!roomCode || !e2eeKey) return '';
      const base = `${window.location.origin}${window.location.pathname}`;
      return `${base}?role=${targetRole}&room=${roomCode}#k=${e2eeKey}`;
    },
    [roomCode, e2eeKey]
  );

  const state: BridgeConnectionState = {
    mode,
    roomCode,
    e2eeKey,
    keyFingerprint,
    hostOnline,
    clientOnline,
    wsConnected,
    encryptedPackets,
    lastLatencyMs,
    pairingError,
  };

  return {
    state,
    setMode,
    sendFromHost,
    sendFromClient,
    rotatePairingSession,
    joinManualRoom,
    getPairingUrl,
  };
}
