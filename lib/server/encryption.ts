import crypto from "node:crypto";

/**
 * Server-only secret encryption (AES-256-GCM). Used to protect tenant integration credentials
 * at rest. The key comes from SETTINGS_ENCRYPTION_KEY (32 bytes, given as 64-hex or base64).
 * Output/return values are base64 strings of (iv[12] | authTag[16] | ciphertext) for clean
 * storage in a text column and clean transport through supabase-js.
 *
 * NEVER import this into a client component, and never return decrypted output to the client.
 */
function getKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) throw new Error("SETTINGS_ENCRYPTION_KEY is not configured.");
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("SETTINGS_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64).");
  return buf;
}

/** True when a valid encryption key is configured (lets callers degrade gracefully). */
export function encryptionReady(): boolean {
  try { getKey(); return true; } catch { return false; }
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptSecret(payloadB64: string): string {
  const payload = Buffer.from(payloadB64, "base64");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
