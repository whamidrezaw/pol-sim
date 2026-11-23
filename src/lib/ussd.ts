import { normalizeDigits } from './otp';
import type { SimSlot } from '../types/bridge';

export interface UssdValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

export function validateUssdCode(raw: string): UssdValidationResult {
  const normalized = normalizeDigits(raw).replace(/\s+/g, '');
  if (!normalized) {
    return { valid: false, normalized: '', error: 'کد دستوری نمی‌تواند خالی باشد.' };
  }
  if (!/^[#*][0-9*#]+#$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'کد USSD معتبر باید با * یا # شروع و با # تمام شود (مثلاً *1# یا **21*0912...#).',
    };
  }
  if (normalized.length > 32) {
    return { valid: false, normalized, error: 'طول کد دستوری بیش از حد مجاز است.' };
  }
  return { valid: true, normalized };
}

export interface CallForwardingBuildResult {
  valid: boolean;
  code?: string;
  error?: string;
}

export function buildCallForwardingUssd(
  rawPhone: string,
  action: 'enable' | 'disable' | 'status'
): CallForwardingBuildResult {
  if (action === 'disable') {
    return { valid: true, code: '##21#' };
  }
  if (action === 'status') {
    return { valid: true, code: '*#21#' };
  }

  const normalized = normalizeDigits(rawPhone).replace(/[\s\-()]/g, '');
  if (!/^(?:0[1-9]\d{8,9}|\+98[1-9]\d{8,9})$/.test(normalized)) {
    return {
      valid: false,
      error: 'شماره خط VoIP/SIP معتبر وارد کنید (مثلاً 02191001234 یا 09121234567).',
    };
  }
  return {
    valid: true,
    code: `**21*${normalized}#`,
  };
}

export interface UssdEvaluation {
  title: string;
  body: string;
  expectsReply: boolean;
}

export function evaluateUssdCommand(
  code: string,
  simSlot: SimSlot,
  menuInput?: string
): UssdEvaluation {
  const normalized = normalizeDigits(code).replace(/\s+/g, '');
  const carrier = simSlot === 1 ? 'همراه اول' : 'ایرانسل';

  if (normalized.startsWith('**21*') && normalized.endsWith('#')) {
    const dest = normalized.slice(5, -1);
    return {
      title: `دایورت تماس (${carrier})`,
      body: `انتقال تمام تماس‌های ورودی سیم‌کارت ${simSlot} به شماره ${dest} با موفقیت فعال شد.\nاز این پس تماس‌ها از طریق خط VoIP روی CallKit آیفون زنگ می‌خورند.`,
      expectsReply: false,
    };
  }

  if (normalized === '##21#') {
    return {
      title: `لغو دایورت تماس (${carrier})`,
      body: `تمامی تنظیمات دایورت بی‌قیدوشرط روی سیم‌کارت ${simSlot} غیرفعال شد.`,
      expectsReply: false,
    };
  }

  if (normalized === '*#21#') {
    return {
      title: `وضعیت دایورت (${carrier})`,
      body: `سیم‌کارت ${simSlot}: بررسی شبکه انجام شد.\nتماس صوتی: آماده دریافت دستور دایورت.`,
      expectsReply: false,
    };
  }

  if (normalized === '*1#' || normalized === '*10#') {
    if (menuInput === '1') {
      return {
        title: 'استعلام حساب همراه اول',
        body: 'اعتبار فعلی سیم‌کارت ۱: ۱۸۴,۵۰۰ ریال\nبسته اینترنت فعال: ۶.۴ گیگابایت باقی‌مانده تا ۱۴۰۵/۰۹/۱۸',
        expectsReply: false,
      };
    }
    if (menuInput === '2') {
      return {
        title: 'بسته‌های اینترنت همراه اول',
        body: '۱. بسته یک‌ماهه ۵ گیگابایت — ۲۹۵,۰۰۰ ریال\n۲. بسته یک‌ماهه ۱۰ گیگابایت — ۴۶۰,۰۰۰ ریال\n۳. بسته شبانه نامحدود — ۱۱۰,۰۰۰ ریال',
        expectsReply: false,
      };
    }
    return {
      title: 'منوی اصلی همراه اول (*1#)',
      body: '۱. استعلام اعتبار و مانده اینترنت\n۲. خرید بسته اینترنت پرسرعت\n۳. خرید شارژ مستقیم\nبرای ادامه عدد ۱ یا ۲ را ارسال کنید.',
      expectsReply: true,
    };
  }

  if (normalized === '*100#' || normalized === '*100*0#') {
    return {
      title: 'بسته‌های اینترنت همراه اول',
      body: 'بسته فعال شما: ۱۰ گیگابایت ماهانه\nحجم باقی‌مانده: ۶.۴۲ گیگابایت\nتاریخ انقضا: ۱۴۰۵/۰۹/۱۸ ساعت ۲۳:۵۹',
      expectsReply: false,
    };
  }

  if (normalized === '*555*1*2#' || normalized === '*141*1#') {
    return {
      title: 'استعلام اعتبار ایرانسل',
      body: 'مانده اعتبار سیم‌کارت ۲ (ایرانسل): ۲۴۲,۰۰۰ ریال\nباقی‌مانده بسته اینترنت: ۴.۱ گیگابایت (اعتبار ۱۲ روز)',
      expectsReply: false,
    };
  }

  if (normalized === '*555#') {
    if (menuInput === '1') {
      return {
        title: 'حساب من — ایرانسل',
        body: 'اعتبار اصلی: ۲۴۲,۰۰۰ ریال\nامتیاز ایرانسل من: ۳۴۰ امتیاز\nطرح تعرفه: ثانیه‌ای',
        expectsReply: false,
      };
    }
    return {
      title: 'ایرانسل من (*555#)',
      body: '۱. مانده اعتبار و بسته\n۲. خرید بسته اینترنت 4G/5G\n۳. سرویس‌های ارزش افزوده\nبرای استعلام فوری عدد ۱ را ارسال کنید.',
      expectsReply: true,
    };
  }

  return {
    title: `پاسخ شبکه ${carrier} (${normalized})`,
    body: `کد دستوری ${normalized} روی سیم‌کارت ${simSlot} اجرا شد.\nپاسخ اپراتور: درخواست شما ثبت و با موفقیت پردازش گردید.`,
    expectsReply: false,
  };
}
