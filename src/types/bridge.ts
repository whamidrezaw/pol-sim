export type SimSlot = 1 | 2;

export type DeviceMode = 'dual' | 'client' | 'host';

export type TransportLayer = 'ble_wake' | 'wifi_tls' | 'e2ee_relay';

export type CallTier = 'level1_multipoint' | 'level2_callkit_voip' | 'level3_root_hardware';

export type SmsDirection = 'incoming' | 'outgoing';

export type SmsDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'received' | 'failed';

export interface SmsMessage {
  id: string;
  address: string;
  contactName: string;
  body: string;
  direction: SmsDirection;
  simSlot: SimSlot;
  carrierName: string;
  timestamp: number;
  status: SmsDeliveryStatus;
  read: boolean;
  otpCode?: string | null;
  category: 'bank' | 'carrier' | 'service' | 'personal';
}

export type CallDirection = 'incoming' | 'outgoing' | 'missed' | 'rejected';

export interface CallLogEntry {
  id: string;
  number: string;
  contactName: string;
  direction: CallDirection;
  simSlot: SimSlot;
  timestamp: number;
  durationSec: number;
  tierUsed: CallTier;
  rejectSmsSent?: string;
}

export interface ActiveCallState {
  id: string;
  number: string;
  contactName: string;
  simSlot: SimSlot;
  carrierName: string;
  state: 'ringing' | 'dialing' | 'connected';
  startedAt: number;
  connectedAt?: number;
  muted: boolean;
  speaker: boolean;
  audioRoute: 'multipoint_headset' | 'callkit_voip' | 'host_speaker';
}

export interface UssdHistoryEntry {
  id: string;
  code: string;
  simSlot: SimSlot;
  carrierName: string;
  title: string;
  response: string;
  expectsReply: boolean;
  timestamp: number;
}

export interface SimStatus {
  slot: SimSlot;
  carrier: string;
  phoneNumber: string;
  signalStrength: 0 | 1 | 2 | 3 | 4;
  networkType: '5G' | '4G+' | '4G' | '3G' | 'No Service';
  active: boolean;
}

export interface HostTelemetry {
  deviceModel: string;
  androidVersion: string;
  batteryPercent: number;
  isCharging: boolean;
  smartBatterySaver: boolean;
  hotspotEnabled: boolean;
  hotspotSsid: string;
  hotspotPassword: string;
  hotspotDataUsedMb: number;
  bleWakeReady: boolean;
  multipointHeadsetName: string | null;
  multipointConnected: boolean;
  transportLayer: TransportLayer;
  callTier: CallTier;
  voipForwardNumber: string;
  forwardingEnabled: boolean;
  sims: [SimStatus, SimStatus];
  lastHeartbeat: number;
}

export interface ContactItem {
  id: string;
  name: string;
  number: string;
  preferredSim: SimSlot;
}

export interface EncryptedEnvelope {
  iv: string;
  ct: string;
}

export type BridgeEvent =
  | { type: 'sms:incoming'; message: SmsMessage }
  | { type: 'sms:send_request'; message: SmsMessage }
  | { type: 'sms:status_update'; id: string; status: SmsDeliveryStatus }
  | { type: 'call:incoming'; call: ActiveCallState }
  | { type: 'call:dial_request'; number: string; contactName: string; simSlot: SimSlot }
  | { type: 'call:action'; callId: string; action: 'answer' | 'reject' | 'hangup' | 'mute' | 'speaker'; rejectSms?: string }
  | { type: 'call:state_sync'; activeCall: ActiveCallState | null; logEntry?: CallLogEntry }
  | { type: 'ussd:request'; id: string; code: string; simSlot: SimSlot; menuInput?: string }
  | { type: 'ussd:response'; entry: UssdHistoryEntry }
  | { type: 'telemetry:sync'; telemetry: HostTelemetry }
  | { type: 'telemetry:command'; command: 'toggle_hotspot' | 'toggle_battery_saver' | 'set_call_tier' | 'set_voip_forward'; value?: string | boolean };
