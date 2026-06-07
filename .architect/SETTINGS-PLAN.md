Here is the concrete data model and verification plan for the "Foundations" phase, covering tenant brand/design tokens, generic integrations, and tenant settings.

---
### 1. SQL Migration (0031)

**RULING 19: SQL Migration for Foundations Data Model**

```sql
-- Migration 0031_foundations_brand_integrations_settings.sql

-- 1. website_brand_settings: Stores tenant-specific brand and design tokens.
--    Reuses and extends the concept of website_brand_settings from canonical plan Step 5/6.
CREATE TABLE IF NOT EXISTS public.website_brand_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL, -- Enforced by application logic, no external FK
    website_id uuid NOT NULL, -- Enforced by application logic, no external FK
    brand_name text,
    logo_url text,
    favicon_url text,
    color_palette jsonb NOT NULL DEFAULT '{
        "primary": "#007bff", "secondary": "#6c757d", "accent": "#fd7e14",
        "background": "#ffffff", "surface": "#f8f9fa", "border": "#dee2e6",
        "foreground": "#212529", "muted": "#6c757d"
    }'::jsonb,
    font_pairing jsonb NOT NULL DEFAULT '{
        "heading": "Roboto", "body": "Open Sans"
    }'::jsonb,
    background_style jsonb NOT NULL DEFAULT '{}'::jsonb, -- e.g., { "type": "solid", "value": "#ffffff" } or { "type": "gradient", "value": "linear-gradient(...)" }
    spacing_scale jsonb NOT NULL DEFAULT '{}'::jsonb, -- e.g., { "base": 16, "unit": "px" }
    button_style jsonb NOT NULL DEFAULT '{}'::jsonb, -- e.g., { "borderRadius": "4px", "padding": "12px 24px" }
    hero_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
    gallery_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (tenant_id, website_id)
);
CREATE INDEX IF NOT EXISTS idx_website_brand_settings_tenant_website ON public.website_brand_settings (tenant_id, website_id);

-- 2. tenant_integrations: Stores non-secret configuration and status for tenant integrations.
CREATE TABLE IF NOT EXISTS public.tenant_integrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL, -- Enforced by application logic, no external FK
    provider text NOT NULL, -- e.g., 'twilio', 'shopify', 'gohighlevel', 'stripe', 'google_ads', 'facebook_pixel', 'cloudflare', 'google_business_profile'
    status text NOT NULL DEFAULT 'disconnected', -- Enum: 'connected', 'disconnected', 'error', 'pending'
    config jsonb NOT NULL DEFAULT '{}'::jsonb, -- Non-secret config, e.g., account_id, public_key_id, webhook_url, display_name, connected_email
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (tenant_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_tenant_id ON public.tenant_integrations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_provider ON public.tenant_integrations (provider);

-- 3. tenant_secrets: Stores encrypted sensitive credentials for tenant integrations.
CREATE TABLE IF NOT EXISTS public.tenant_secrets (
    tenant_id uuid NOT NULL, -- Enforced by application logic, no external FK
    provider text NOT NULL, -- Matches tenant_integrations.provider
    encrypted_payload bytea NOT NULL, -- Encrypted secret data (e.g., API keys, OAuth tokens)
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (tenant_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_tenant_secrets_tenant_id ON public.tenant_secrets (tenant_id);

-- 4. tenant_settings: Stores miscellaneous per-tenant preferences and flags.
CREATE TABLE IF NOT EXISTS public.tenant_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL, -- Enforced by application logic, no external FK
    setting_key text NOT NULL, -- e.g., 'default_timezone', 'currency', 'ai_bootstrap_enabled', 'feature_flag_x'
    setting_value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (tenant_id, setting_key)
);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON public.tenant_settings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_key ON public.tenant_settings (setting_key);
```

---
### 2. Encryption Helper Interface

**RULING 20: Encryption Service Interface**

```typescript
// lib/server/encryption.ts (server-side only)
import { Buffer } from 'buffer';

export interface EncryptionService {
  /**
   * Encrypts a plaintext string using AES-256-GCM with a derived key.
   * The returned Buffer should contain the ciphertext, IV, and authentication tag.
   * @param plaintext The string to encrypt.
   * @returns A Buffer containing the encrypted data.
   * @throws Error if encryption fails or SETTINGS_ENCRYPTION_KEY is not configured.
   */
  encrypt(plaintext: string): Promise<Buffer>;

  /**
   * Decrypts an encrypted Buffer back to a plaintext string.
   * @param encryptedData A Buffer containing the encrypted data (ciphertext + IV + authTag).
   * @returns The decrypted plaintext string.
   * @throws Error if decryption fails or SETTINGS_ENCRYPTION_KEY is not configured/invalid.
   */
  decrypt(encryptedData: Buffer): Promise<string>;
}
```

---
### 3. Supervisor Verification Checks

**RULING 21: Supervisor Verification Schema for Foundations**

```json
{
  "foundations_data_model": [
    { "id": "FDM-V1", "assertion": "public.website_brand_settings table exists with specified columns, types, defaults, and UNIQUE (tenant_id, website_id) constraint.", "severity": "block" },
    { "id": "FDM-V2", "assertion": "public.tenant_integrations table exists with specified columns, types, defaults, and UNIQUE (tenant_id, provider) constraint.", "severity": "block" },
    { "id": "FDM-V3", "assertion": "public.tenant_secrets table exists with specified columns, types, and PRIMARY KEY (tenant_id, provider) constraint.", "severity": "block" },
    { "id": "FDM-V4", "assertion": "public.tenant_settings table exists with specified columns, types, and UNIQUE (tenant_id, setting_key) constraint.", "severity": "block" },
    { "id": "FDM-V5", "assertion": "All specified indexes (idx_website_brand_settings_tenant_website, idx_tenant_integrations_tenant_id, idx_tenant_integrations_provider, idx_tenant_secrets_tenant_id, idx_tenant_settings_tenant_id, idx_tenant_settings_key) exist.", "severity": "block" },
    { "id": "FDM-V6", "assertion": "The migration script 0031_foundations_brand_integrations_settings.sql is idempotent.", "severity": "block" }
  ],
  "foundations_application_logic": [
    { "id": "FAL-V1", "assertion": "All API endpoints/server actions interacting with website_brand_settings, tenant_integrations, tenant_secrets, and tenant_settings strictly enforce tenant_id matching the authenticated user's tenant_id (or a superadmin-provided tenant_id).", "severity": "block" },
    { "id": "FAL-V2", "assertion": "When storing sensitive data in tenant_secrets, the encrypted_payload is always a Buffer (bytea in DB) containing encrypted data.", "severity": "block" },
    { "id": "FAL-V3", "assertion": "The raw (decrypted) content of tenant_secrets.encrypted_payload is NEVER returned directly to any client. Only non-sensitive configuration from tenant_integrations.config should be client-accessible.", "severity": "block" },
    { "id": "FAL-V4", "assertion": "The EncryptionService requires the SETTINGS_ENCRYPTION_KEY environment variable to be present and valid for both encryption and decryption operations.", "severity": "block" },
    { "id": "FAL-V5", "assertion": "Writes/updates to sensitive tenant_settings (e.g., 'ai_bootstrap_enabled') or tenant_integrations (e.g., 'gohighlevel' setup) are gated by platform_role (admin/superadmin) or specific tenant permissions.", "severity": "block" },
    { "id": "FAL-V6", "assertion": "Sensitive operations (e.g., tenant_integrations status changes, tenant_secrets creation/update/deletion) trigger entries in the platform_audit_log table.", "severity": "block" },
    { "id": "FAL-V7", "assertion": "The default color_palette and font_pairing in website_brand_settings are correctly applied for new website brand settings.", "severity": "block" }
  ]
}
```

---
DECISION-LOG
[D-020] approve_foundations_data_model — Approved SQL migration 0031 for website_brand_settings, tenant_integrations, tenant_secrets, and tenant_settings (status: approved)
[D-021] define_encryption_interface — Defined the TypeScript interface for the server-side EncryptionService (status: defined)
[D-022] define_foundations_verification_checks — Defined Supervisor verification checks for data model integrity and application-level logic for foundations (status: defined)