// Rotate ONE secret inside the encrypted ai-agent vault (ai-agent/config/.env.vault).
// Decrypts → replaces the named key → re-encrypts (AES-256-GCM, fresh IV) → overwrites.
// Never prints secret values. You supply everything via env, so the key never lives in shell history
// if you set it carefully.
//
// PowerShell:
//   $env:VAULT_PASSWORD="<your vault password>"
//   $env:SECRET_NAME="ANTHROPIC_API_KEY"
//   $env:SECRET_VALUE="<the NEW anthropic key>"
//   node ai-agent/config/rotate-vault-secret.mjs
//   Remove-Item Env:VAULT_PASSWORD, Env:SECRET_VALUE   # clear them afterwards
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const password = process.env.VAULT_PASSWORD;
const name = process.env.SECRET_NAME;
const value = process.env.SECRET_VALUE;
if (!password || !name || !value) {
  console.error("Set VAULT_PASSWORD, SECRET_NAME and SECRET_VALUE env vars first.");
  process.exit(1);
}

const vaultPath = path.join(process.cwd(), "ai-agent/config/.env.vault");
if (!fs.existsSync(vaultPath)) { console.error("Missing ai-agent/config/.env.vault (run from the repo root)."); process.exit(1); }
const key = crypto.createHash("sha256").update(password).digest();

// decrypt — layout: [16 IV][16 TAG][CIPHERTEXT]
let payload;
try {
  const raw = Buffer.from(fs.readFileSync(vaultPath, "utf8").trim(), "base64");
  const dec = crypto.createDecipheriv("aes-256-gcm", key, raw.subarray(0, 16));
  dec.setAuthTag(raw.subarray(16, 32));
  payload = JSON.parse(Buffer.concat([dec.update(raw.subarray(32)), dec.final()]).toString("utf8"));
} catch {
  console.error("Could not decrypt the vault — wrong VAULT_PASSWORD?");
  process.exit(1);
}

const existed = name in payload;
payload[name] = value;

// re-encrypt with a fresh IV
const iv = crypto.randomBytes(16);
const enc = crypto.createCipheriv("aes-256-gcm", key, iv);
const ct = Buffer.concat([enc.update(JSON.stringify(payload), "utf8"), enc.final()]);
const blob = Buffer.concat([iv, enc.getAuthTag(), ct]).toString("base64");

// back up the old blob, then overwrite
fs.writeFileSync(vaultPath + ".bak", fs.readFileSync(vaultPath));
fs.writeFileSync(vaultPath, blob);
console.log(`${existed ? "Updated" : "Added"} ${name} in .env.vault (backup: .env.vault.bak). Verify the agent boots, then revoke the old key in the Anthropic console.`);
