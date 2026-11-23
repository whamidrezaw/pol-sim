import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCallForwardingUssd, evaluateUssdCommand, validateUssdCode } from './ussd';

test('validates standard and Persian-digit USSD codes', () => {
  const ok1 = validateUssdCode('*۱#');
  assert.equal(ok1.valid, true);
  assert.equal(ok1.normalized, '*1#');

  const ok2 = validateUssdCode('**21*02191004820#');
  assert.equal(ok2.valid, true);

  const bad1 = validateUssdCode('12345');
  assert.equal(bad1.valid, false);
  assert.ok(bad1.error);

  const bad2 = validateUssdCode('');
  assert.equal(bad2.valid, false);
});

test('builds call forwarding USSD commands safely', () => {
  const enable = buildCallForwardingUssd('021-9100-4820', 'enable');
  assert.equal(enable.valid, true);
  assert.equal(enable.code, '**21*02191004820#');

  const disable = buildCallForwardingUssd('', 'disable');
  assert.equal(disable.valid, true);
  assert.equal(disable.code, '##21#');

  const invalid = buildCallForwardingUssd('123', 'enable');
  assert.equal(invalid.valid, false);
});

test('evaluates interactive USSD carrier menus', () => {
  const root = evaluateUssdCommand('*1#', 1);
  assert.equal(root.expectsReply, true);
  assert.ok(root.body.includes('۱. استعلام اعتبار'));

  const step1 = evaluateUssdCommand('*1#', 1, '1');
  assert.equal(step1.expectsReply, false);
  assert.ok(step1.body.includes('ریال'));
});
