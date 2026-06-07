import fs from "fs";
import path from "path";
import crypto from "crypto";

type VaultPayload = Record<string, string>;

function decryptVault(encryptedBase64: string, password: string): VaultPayload {
  const raw = Buffer.from(encryptedBase64.trim(), "base64");

  // Layout: [16 bytes IV][16 bytes TAG][rest = CIPHERTEXT]
  const iv = raw.subarray(0, 16);
  const tag = raw.subarray(16, 32);
  const ciphertext = raw.subarray(32);

  const key = crypto.createHash("sha256").update(password).digest();

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

export function loadVault() {
  const vaultPath = path.join(process.cwd(), "ai-agent/config/.env.vault");

  if (!fs.existsSync(vaultPath)) {
    throw new Error("Missing .env.vault");
  }

  const password = process.env.VAULT_PASSWORD;
  if (!password) {
    throw new Error("Missing VAULT_PASSWORD environment variable.");
  }

  const encrypted = fs.readFileSync(vaultPath, "utf8").trim();
  if (!encrypted) {
    throw new Error(".env.vault is empty.");
  }

  const payload = decryptVault(encrypted, password);

  return {
    raw: encrypted,
    get(key: string): string | null {
      return payload[key] ?? null;
    }
  };
}
