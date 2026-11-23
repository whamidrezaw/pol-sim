import test from 'node:test';
import assert from 'node:assert/strict';
import { detectSenderCategory, extractOtp, normalizeDigits, toPersianDigits } from './otp';

test('normalizes Persian and Arabic digits to ASCII', () => {
  assert.equal(normalizeDigits('کد: ۴۸۲۹۱۵ و ٠١٢٣'), 'کد: 482915 و 0123');
  assert.equal(toPersianDigits('649281'), '۶۴۹۲۸۱');
});

test('extracts Bank Mellat OTP while ignoring card number and Rial amount', () => {
  const sms = 'بانک ملت\nرمز پویا: ۶۴۹۲۸۱\nمبلغ: ۱۲,۵۰۰,۰۰۰ ریال\nکارت: 6104****4821\nتاریخ: 1404/09/02';
  const match = extractOtp(sms, 'BankMellat');
  assert.ok(match);
  assert.equal(match.code, '649281');
  assert.equal(match.confidence, 'high');
  assert.equal(match.issuerHint, 'بانک ملت');
});

test('extracts English verification code OTP', () => {
  const sms = 'Your verification code: 817392. Valid for 2 minutes.';
  const match = extractOtp(sms, 'AuthService');
  assert.ok(match);
  assert.equal(match.code, '817392');
});

test('ignores ordinary personal SMS containing mobile numbers or amounts', () => {
  const sms = 'سلام، شماره من 09123456789 هست و مبلغ 450,000 تومان واریز شد.';
  assert.equal(extractOtp(sms, '09124859912'), null);
});

test('classifies sender categories accurately', () => {
  assert.equal(detectSenderCategory('BankMellat', 'رمز پویا: 123456'), 'bank');
  assert.equal(detectSenderCategory('MCI', 'بسته همراه اول'), 'carrier');
  assert.equal(detectSenderCategory('DigiKala', 'کد ورود: 45123'), 'service');
  assert.equal(detectSenderCategory('09124859912', 'سلام فردا میبینمت'), 'personal');
});
