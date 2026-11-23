import type {
  CallLogEntry,
  ContactItem,
  HostTelemetry,
  SmsMessage,
  UssdHistoryEntry,
} from '../types/bridge';

const now = Date.now();

export const INITIAL_HOST_TELEMETRY: HostTelemetry = {
  deviceModel: 'Samsung Galaxy A55 5G',
  androidVersion: 'Android 15 · One UI 7',
  batteryPercent: 84,
  isCharging: false,
  smartBatterySaver: true,
  hotspotEnabled: true,
  hotspotSsid: 'PolSim-5G-Bridge',
  hotspotPassword: 'PS-8492-TLS',
  hotspotDataUsedMb: 428,
  bleWakeReady: true,
  multipointHeadsetName: 'Sony WF-1000XM5',
  multipointConnected: true,
  transportLayer: 'wifi_tls',
  callTier: 'level1_multipoint',
  voipForwardNumber: '02191004820',
  forwardingEnabled: false,
  sims: [
    {
      slot: 1,
      carrier: 'همراه اول',
      phoneNumber: '09123456789',
      signalStrength: 4,
      networkType: '5G',
      active: true,
    },
    {
      slot: 2,
      carrier: 'ایرانسل',
      phoneNumber: '09357891234',
      signalStrength: 3,
      networkType: '4G+',
      active: true,
    },
  ],
  lastHeartbeat: now,
};

export const INITIAL_CONTACTS: ContactItem[] = [
  { id: 'c1', name: 'مهندس رضایی', number: '09121184420', preferredSim: 1 },
  { id: 'c2', name: 'سارا محمدی', number: '09124859912', preferredSim: 1 },
  { id: 'c3', name: 'دفتر مرکزی تهران', number: '02188741200', preferredSim: 1 },
  { id: 'c4', name: 'پشتیبانی اینترنت', number: '09351102200', preferredSim: 2 },
  { id: 'c5', name: 'امیرحسین کریمی', number: '09192203144', preferredSim: 2 },
];

export const INITIAL_SMS: SmsMessage[] = [
  {
    id: 'sms-1',
    address: 'BankMellat',
    contactName: 'بانک ملت',
    body: 'بانک ملت\nرمز پویا: 649281\nمبلغ: 4,850,000 ریال\nکارت: 6104****4821\nاعتبار تا ۲ دقیقه دیگر',
    direction: 'incoming',
    simSlot: 1,
    carrierName: 'همراه اول',
    timestamp: now - 1000 * 60 * 3,
    status: 'received',
    read: false,
    otpCode: '649281',
    category: 'bank',
  },
  {
    id: 'sms-2',
    address: '09124859912',
    contactName: 'سارا محمدی',
    body: 'سلام، فایل قرارداد رو براتون ایمیل کردم. لطفاً تا ساعت ۴ بررسی کنید.',
    direction: 'incoming',
    simSlot: 1,
    carrierName: 'همراه اول',
    timestamp: now - 1000 * 60 * 24,
    status: 'received',
    read: true,
    otpCode: null,
    category: 'personal',
  },
  {
    id: 'sms-3',
    address: '09124859912',
    contactName: 'سارا محمدی',
    body: 'ممنون، الان بررسی می‌کنم و نتیجه رو همینجا پیامک می‌دم.',
    direction: 'outgoing',
    simSlot: 1,
    carrierName: 'همراه اول',
    timestamp: now - 1000 * 60 * 21,
    status: 'delivered',
    read: true,
    otpCode: null,
    category: 'personal',
  },
  {
    id: 'sms-4',
    address: 'BluBank',
    contactName: 'بلوبانک',
    body: 'کد تایید ورود به بلوبانک شما: 81739\nاین کد را در اختیار دیگران قرار ندهید.',
    direction: 'incoming',
    simSlot: 2,
    carrierName: 'ایرانسل',
    timestamp: now - 1000 * 60 * 65,
    status: 'received',
    read: true,
    otpCode: '81739',
    category: 'bank',
  },
  {
    id: 'sms-5',
    address: 'MCI',
    contactName: 'همراه اول',
    body: 'مشترک گرامی، ۸۰ درصد از بسته اینترنت یک‌ماهه شما مصرف شده است. برای تمدید *100# را شماره‌گیری کنید.',
    direction: 'incoming',
    simSlot: 1,
    carrierName: 'همراه اول',
    timestamp: now - 1000 * 60 * 140,
    status: 'received',
    read: true,
    otpCode: null,
    category: 'carrier',
  },
];

export const INITIAL_CALL_LOGS: CallLogEntry[] = [
  {
    id: 'call-1',
    number: '09121184420',
    contactName: 'مهندس رضایی',
    direction: 'incoming',
    simSlot: 1,
    timestamp: now - 1000 * 60 * 42,
    durationSec: 194,
    tierUsed: 'level1_multipoint',
  },
  {
    id: 'call-2',
    number: '02188741200',
    contactName: 'دفتر مرکزی تهران',
    direction: 'missed',
    simSlot: 1,
    timestamp: now - 1000 * 60 * 115,
    durationSec: 0,
    tierUsed: 'level1_multipoint',
  },
  {
    id: 'call-3',
    number: '09192203144',
    contactName: 'امیرحسین کریمی',
    direction: 'outgoing',
    simSlot: 2,
    timestamp: now - 1000 * 60 * 240,
    durationSec: 86,
    tierUsed: 'level2_callkit_voip',
  },
];

export const INITIAL_USSD_HISTORY: UssdHistoryEntry[] = [
  {
    id: 'ussd-1',
    code: '*100#',
    simSlot: 1,
    carrierName: 'همراه اول',
    title: 'بسته‌های اینترنت همراه اول',
    response: 'بسته فعال شما: ۱۰ گیگابایت ماهانه\nحجم باقی‌مانده: ۶.۴۲ گیگابایت\nتاریخ انقضا: ۱۴۰۵/۰۹/۱۸ ساعت ۲۳:۵۹',
    expectsReply: false,
    timestamp: now - 1000 * 60 * 50,
  },
];

export const QUICK_REJECT_TEMPLATES = [
  'الان در جلسه هستم، کمی بعد تماس می‌گیرم.',
  'در حال رانندگی هستم، لطفاً پیامک بفرستید.',
  'تا ۱۵ دقیقه دیگر با شما تماس می‌گیرم.',
];

export const USSD_PRESETS = [
  { code: '*1#', label: 'منوی اصلی', carrier: 'همراه اول', simSlot: 1 as const },
  { code: '*100#', label: 'مانده اینترنت', carrier: 'همراه اول', simSlot: 1 as const },
  { code: '*555*1*2#', label: 'استعلام اعتبار', carrier: 'ایرانسل', simSlot: 2 as const },
  { code: '*555#', label: 'ایرانسل من', carrier: 'ایرانسل', simSlot: 2 as const },
  { code: '*#21#', label: 'وضعیت دایورت', carrier: 'هر دو سیم‌کارت', simSlot: 1 as const },
];

export const HOST_SIMULATION_PRESETS = [
  {
    id: 'otp-mellat',
    label: 'رمز پویا بانک ملت',
    sender: 'BankMellat',
    contactName: 'بانک ملت',
    simSlot: 1 as const,
    body: () => {
      const code = String(Math.floor(100000 + Math.random() * 899999));
      return `بانک ملت\nرمز پویا: ${code}\nمبلغ: 12,400,000 ریال\nکارت: 6104****4821`;
    },
  },
  {
    id: 'otp-saman',
    label: 'رمز ورود بانک سامان',
    sender: 'SamanBank',
    contactName: 'بانک سامان',
    simSlot: 2 as const,
    body: () => {
      const code = String(Math.floor(100000 + Math.random() * 899999));
      return `سامانک\nکد تایید شما: ${code}\nاین کد تا ۲ دقیقه معتبر است.`;
    },
  },
  {
    id: 'otp-digikala',
    label: 'کد ورود دیجی‌کالا',
    sender: 'DigiKala',
    contactName: 'دیجی‌کالا',
    simSlot: 1 as const,
    body: () => {
      const code = String(Math.floor(10000 + Math.random() * 89999));
      return `دیجی‌کالا\nکد ورود: ${code}\nخوش آمدید.`;
    },
  },
  {
    id: 'sms-personal',
    label: 'پیامک شخصی (سارا)',
    sender: '09124859912',
    contactName: 'سارا محمدی',
    simSlot: 1 as const,
    body: () => 'سلام، لینک جلسه ساعت ۵ ارسال شد. روی آیفون می‌تونید چک کنید؟',
  },
];

export const PHASE0_FEASIBILITY_ITEMS = [
  {
    id: 'p0-ble',
    title: 'بیدارباش پس‌زمینه آیفون با BLE (CoreBluetooth)',
    target: 'آیفون در حالت قفل صفحه (Screen Locked)',
    criteria: 'دریافت اعلان پیامک OTP زیر ۱.۵ ثانیه با نرخ موفقیت بالای ۹۵٪',
  },
  {
    id: 'p0-sms',
    title: 'خواندن و ارسال SMS دوسیم‌کارته در اندروید',
    target: 'SmsManager + BroadcastReceiver (Android 12–15)',
    criteria: 'تشخیص دقیق subscriptionId برای سیم ۱ و سیم ۲ بدون افت بسته',
  },
  {
    id: 'p0-ussd',
    title: 'اجرای کدهای USSD در پس‌زمینه',
    target: 'TelephonyManager.sendUssdRequest (API 26+)',
    criteria: 'دریافت پاسخ متنی کامل *1# و *555*1*2# بدون باز شدن پنجره سیستمی',
  },
  {
    id: 'p0-battery',
    title: 'پایداری Foreground Service در One UI / HyperOS',
    target: 'معافیت Doze Mode و Battery Optimization',
    criteria: 'دوام بیش از ۲۴ ساعت در جیب بدون بسته شدن سرویس میزبان توسط سیستم‌عامل',
  },
  {
    id: 'p0-call',
    title: 'کنترل تماس یا دایورت CallKit',
    target: 'TelecomManager + Multipoint / VoIP SIP (**21*)',
    criteria: 'پاسخ‌دهی و رد تماس آنی با ارسال پیامک سریع بدون خارج کردن اندروید از کیف',
  },
];

export const KOTLIN_GATEWAY_SNIPPET = `// PolSim Android Host Gateway — SmsBridgeReceiver.kt
class SmsBridgeReceiver(private val wsBridge: EncryptedBridgeSocket) : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val subId = intent.getIntExtra("subscription", -1)
    val simSlot = resolveSimSlot(context, subId) // 1 or 2

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
    val sender = messages.firstOrNull()?.displayOriginatingAddress ?: return
    val fullBody = messages.joinToString("") { it.displayMessageBody }

    // Encrypts payload locally with AES-256-GCM before leaving device
    wsBridge.sendEncrypted(
      type = "sms:incoming",
      payload = mapOf(
        "address" to sender,
        "body" to fullBody,
        "simSlot" to simSlot,
        "timestamp" to System.currentTimeMillis()
      )
    )
  }
}`;

export const SWIFT_CLIENT_SNIPPET = `// PolSim iPhone Client — BleWakeCentral.swift
final class BleWakeCentral: NSObject, CBCentralManagerDelegate {
  private var central: CBCentralManager!
  private let serviceUUID = CBUUID(string: "7A4E1000-9B2C-4F11-8D3A-504F4C53494D")

  override init() {
    super.init()
    central = CBCentralManager(
      delegate: self,
      queue: .main,
      options: [CBCentralManagerOptionRestoreIdentifierKey: "ir.polsim.ble.central"]
    )
  }

  func centralManager(_ central: CBCentralManager, didUpdateState state: CBManagerState) {
    if state == .poweredOn {
      central.scanForPeripherals(withServices: [serviceUUID], options: nil)
    }
  }
}`;
