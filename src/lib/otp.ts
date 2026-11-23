export interface OtpMatch {
  code: string;
  confidence: 'high' | 'medium';
  issuerHint: string;
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function normalizeDigits(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const pIdx = PERSIAN_DIGITS.indexOf(ch);
    if (pIdx !== -1) {
      out += String(pIdx);
      continue;
    }
    const aIdx = ARABIC_DIGITS.indexOf(ch);
    if (aIdx !== -1) {
      out += String(aIdx);
      continue;
    }
    out += ch;
  }
  return out;
}

export function toPersianDigits(input: string | number): string {
  const str = String(input);
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch >= '0' && ch <= '9') {
      out += PERSIAN_DIGITS[Number(ch)];
    } else {
      out += ch;
    }
  }
  return out;
}

const OTP_KEYWORDS = [
  'رمز پویا',
  'رمز دوم',
  'رمز یکبار مصرف',
  'رمز یک‌بارمصرف',
  'کد تایید',
  'کد تأیید',
  'کد ورود',
  'کد فعالسازی',
  'کد فعال‌سازی',
  'کد احراز',
  'کد امنیتی',
  'رمز:',
  'کد:',
  'otp',
  'verification code',
  'passcode',
  'login code',
  'security code',
  'pin:',
  'code:',
];

const BANK_HINTS: Array<{ match: RegExp; label: string }> = [
  { match: /ملت|mellat|behpardakht/i, label: 'بانک ملت' },
  { match: /سامان|saman|sep/i, label: 'بانک سامان' },
  { match: /ملی|melli|bmi/i, label: 'بانک ملی' },
  { match: /پاسارگاد|pasargad|bpi/i, label: 'بانک پاسارگاد' },
  { match: /بلوبانک|بلو|blubank/i, label: 'بلوبانک' },
  { match: /تجارت|tejarat/i, label: 'بانک تجارت' },
  { match: /صادرات|saderat/i, label: 'بانک صادرات' },
  { match: /کشاورزی|keshavarzi/i, label: 'بانک کشاورزی' },
  { match: /دیجی‌کالا|دیجی کالا|digikala/i, label: 'دیجی‌کالا' },
  { match: /اسنپ|snapp/i, label: 'اسنپ' },
  { match: /تپسی|tapsi/i, label: 'تپسی' },
  { match: /همراه اول|mci/i, label: 'همراه اول' },
  { match: /ایرانسل|irancell|mtn/i, label: 'ایرانسل' },
];

export function detectSenderCategory(
  sender: string,
  body: string
): 'bank' | 'carrier' | 'service' | 'personal' {
  const combined = `${sender} ${body}`;
  if (
    /بانک|ملت|ملی|سامان|پاسارگاد|بلو|تجارت|صادرات|کشاورزی|شاپرک|کارت|برداشت|واریز|رمز پویا|bank|mellat|melli|saman|pasargad|blu|tejarat|saderat/i.test(
      combined
    )
  ) {
    return 'bank';
  }
  if (/همراه اول|ایرانسل|رایتل|mci|irancell|rightel/i.test(combined)) {
    return 'carrier';
  }
  if (/اسنپ|تپسی|دیجی|کد ورود|کد تایید|snapp|tapsi|digikala|otp|verification/i.test(combined)) {
    return 'service';
  }
  return 'personal';
}

function findIssuerHint(sender: string, body: string): string {
  const combined = `${sender} ${body}`;
  for (const item of BANK_HINTS) {
    if (item.match.test(combined)) {
      return item.label;
    }
  }
  return sender || 'پیامک امنیتی';
}

/**
 * Extracts a 4-8 digit OTP code from Persian or English SMS text.
 * Rejects card numbers, currency amounts, dates, and Iranian mobile numbers.
 */
export function extractOtp(text: string, sender = ''): OtpMatch | null {
  const normalized = normalizeDigits(text);
  const lower = normalized.toLowerCase();

  const hasOtpKeyword = OTP_KEYWORDS.some((kw) => lower.includes(kw));
  if (!hasOtpKeyword) {
    return null;
  }

  // Strip patterns that are clearly NOT OTPs before scanning for candidate codes
  const scrubbed = normalized
    // 16-digit card numbers (with dashes or spaces)
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, ' ')
    // Masked card numbers like 6104****4821
    .replace(/\b\d{4,6}\*+\d{4}\b/g, ' ')
    // Iranian mobile numbers 09xxxxxxxxx or +989xxxxxxxxx
    .replace(/(?:\+98|0)9\d{9}\b/g, ' ')
    // Dates like 1404/09/02 or 2026-11-23
    .replace(/\b\d{2,4}[/-]\d{1,2}[/-]\d{1,2}\b/g, ' ')
    // Times like 14:25:10
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' ')
    // Currency amounts followed by ریال or تومان
    .replace(/\b\d{1,3}(?:,\d{3})+\s*(?:ریال|تومان|rial|toman)?/gi, ' ')
    .replace(/\b\d+\s*(?:ریال|تومان|rial|toman)\b/gi, ' ');

  // Priority 1: Code appearing immediately after an OTP keyword
  const keywordPattern =
    /(?:رمز\s*پویا|رمز\s*دوم|رمز\s*یکبار\s*مصرف|رمز\s*یک‌بارمصرف|کد\s*تایید|کد\s*تأیید|کد\s*ورود|کد\s*فعالسازی|کد\s*فعال‌سازی|کد\s*احراز|کد\s*امنیتی|رمز|کد|otp|code|passcode|pin)\s*[:：\-]?\s*(?:شما\s*)?(?:عبارت\s*است\s*از\s*)?(\d{4,8})\b/i;

  const directMatch = scrubbed.match(keywordPattern);
  if (directMatch && directMatch[1]) {
    return {
      code: directMatch[1],
      confidence: 'high',
      issuerHint: findIssuerHint(sender, text),
    };
  }

  // Priority 2: Standalone 5-8 digit code in an OTP-keyword message
  const standaloneMatches = Array.from(scrubbed.matchAll(/(?:^|[\s:\-،.])(\d{5,8})(?=$|[\s.,،؛\n])/g));
  if (standaloneMatches.length > 0) {
    const candidate = standaloneMatches[0][1];
    return {
      code: candidate,
      confidence: 'medium',
      issuerHint: findIssuerHint(sender, text),
    };
  }

  // Priority 3: 4-digit code if no 5-8 digit code matched
  const fourDigitMatches = Array.from(scrubbed.matchAll(/(?:^|[\s:\-،.])(\d{4})(?=$|[\s.,،؛\n])/g));
  if (fourDigitMatches.length > 0) {
    return {
      code: fourDigitMatches[0][1],
      confidence: 'medium',
      issuerHint: findIssuerHint(sender, text),
    };
  }

  return null;
}
