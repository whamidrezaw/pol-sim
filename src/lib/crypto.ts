import type { EncryptedEnvelope } from '../types/bridge';

function getCrypto(): Crypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error('Web Crypto API is not available in this environment.');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateRoomCode(): string {
  const cryptoApi = getCrypto();
  const buf = new Uint32Array(1);
  cryptoApi.getRandomValues(buf);
  const num = (buf[0] % 900000) + 100000;
  return String(num);
}

export async function generateE2eeKey(): Promise<string> {
  const cryptoApi = getCrypto();
  const raw = new Uint8Array(32);
  cryptoApi.getRandomValues(raw);
  return bytesToBase64Url(raw);
}

async function importAesKey(keyB64: string): Promise<CryptoKey> {
  const cryptoApi = getCrypto();
  const raw = base64UrlToBytes(keyB64);
  if (raw.byteLength !== 32) {
    throw new Error('Invalid AES-256 key length.');
  }
  return cryptoApi.subtle.importKey(
    'raw',
    raw.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function computeKeyFingerprint(keyB64: string): Promise<string> {
  const cryptoApi = getCrypto();
  const raw = base64UrlToBytes(keyB64);
  const digest = await cryptoApi.subtle.digest('SHA-256', raw.buffer as ArrayBuffer);
  const hex = Array.from(new Uint8Array(digest))
    .slice(0, 6)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

export async function encryptBridgePayload(
  keyB64: string,
  payload: unknown
): Promise<EncryptedEnvelope> {
  const cryptoApi = getCrypto();
  const key = await importAesKey(keyB64);
  const iv = new Uint8Array(12);
  cryptoApi.getRandomValues(iv);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await cryptoApi.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );
  return {
    iv: bytesToBase64Url(iv),
    ct: bytesToBase64Url(new Uint8Array(encrypted)),
  };
}

export async function decryptBridgePayload<T>(
  keyB64: string,
  envelope: EncryptedEnvelope
): Promise<T> {
  const cryptoApi = getCrypto();
  const key = await importAesKey(keyB64);
  const iv = base64UrlToBytes(envelope.iv);
  const ct = base64UrlToBytes(envelope.ct);
  const decrypted = await cryptoApi.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    ct.buffer as ArrayBuffer
  );
  const json = new TextDecoder().decode(decrypted);
  return JSON.parse(json) as T;
}
