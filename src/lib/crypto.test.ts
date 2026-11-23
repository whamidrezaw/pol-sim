import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeKeyFingerprint,
  decryptBridgePayload,
  encryptBridgePayload,
  generateE2eeKey,
  generateRoomCode,
} from './crypto';

test('generates 6-digit numeric pairing room codes', () => {
  const code = generateRoomCode();
  assert.match(code, /^\d{6}$/);
});

test('round-trips Persian UTF-8 bridge payloads with AES-256-GCM', async () => {
  const key = await generateE2eeKey();
  const fp = await computeKeyFingerprint(key);
  assert.match(fp, /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);

  const payload = {
    type: 'sms:incoming',
    body: 'بانک ملت - رمز پویا: ۶۴۹۲۸۱',
    simSlot: 1,
  };
  const encrypted = await encryptBridgePayload(key, payload);
  assert.ok(encrypted.iv.length > 0);
  assert.ok(encrypted.ct.length > 0);
  assert.equal(encrypted.ct.includes('649281'), false);

  const decrypted = await decryptBridgePayload<typeof payload>(key, encrypted);
  assert.deepEqual(decrypted, payload);
});

test('rejects decryption with a different key', async () => {
  const keyA = await generateE2eeKey();
  const keyB = await generateE2eeKey();
  const encrypted = await encryptBridgePayload(keyA, { secret: 'otp-998877' });

  await assert.rejects(async () => {
    await decryptBridgePayload(keyB, encrypted);
  });
});
