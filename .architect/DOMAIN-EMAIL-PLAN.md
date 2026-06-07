---
### 1. Data Model (SQL Migration)

**RULING 24: SQL Migration for Domain & Email Tables**

```sql
-- Migration 0032_domain_email_tables.sql

-- 1. tenant_domains: Manages tenant-specific domains (subdomains and custom).
CREATE TABLE IF NOT EXISTS public.tenant_domains (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL, -- Enforced by application logic, no external FK
    website_id uuid NOT NULL, -- Enforced by application logic, no external FK
    domain_name text NOT NULL, -- e.g., 'example.com' or 'name.aibizconnect.app'
    type text NOT NULL, -- Enum: 'subdomain', 'custom'
    status text NOT NULL DEFAULT 'pending_verification', -- Enum: 'pending_verification', 'verified', 'pending_nameserver_update', 'active', 'failed', 'inactive', 'pending_publish'
    verification_challenge_type text, -- Enum: 'cname', 'txt', 'nameserver' (for custom domains)
    verification_challenge_name text, -- The host/name for the challenge record (e.g., '_aibizconnect-verify' or '@')
    verification_challenge_value text, -- The value for the challenge record (e.g., TXT string or CNAME target)
    cloudflare_zone_id text, -- Cloudflare Zone ID if this domain is managed by our CF account (for custom domains)
    cloudflare_dns_records_created jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of {id, type, name, content} for records we created on CF
    is_primary boolean NOT NULL DEFAULT FALSE, -- True if this is the primary domain for the associated website
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (tenant_id, domain_name)
);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant_website ON public.tenant_domains (tenant_id, website_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain_name ON public.tenant_domains (domain_name);

-- 2. tenant_email_settings: Manages tenant-specific email sender identities and ESP configuration.
CREATE TABLE IF NOT EXISTS public.tenant_email_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL, -- Enforced by application logic, no external FK
    sender_name text NOT NULL,
    sender_email text NOT NULL, -- The email address used as the sender
    esp_provider text NOT NULL, -- Matches tenant_integrations.provider (e.g., 'resend')
    esp_config jsonb NOT NULL DEFAULT '{}'::jsonb, -- Non-secret ESP config (e.g., region, API endpoint)
    status text NOT NULL DEFAULT 'pending_verification', -- Enum: 'pending_verification', 'verified', 'failed'
    dns_records_required jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of {type, name, value, status: 'pending'|'verified'} for SPF/DKIM/DMARC
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (tenant_id, sender_email)
);
CREATE INDEX IF NOT EXISTS idx_tenant_email_settings_tenant_id ON public.tenant_email_settings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_email_settings_sender_email ON public.tenant_email_settings (sender_email);
```

**Platform Secret Storage:**
Platform-level secrets (e.g., Cloudflare API token, our `aibizconnect.app` zone ID) will be stored in the existing `public.tenant_secrets` table using a reserved `tenant_id`:
*   `PLATFORM_TENANT_ID`: A constant UUID (e.g., `00000000-0000-0000-0000-000000000000`).
*   `provider`: `cloudflare_platform`.
*   `encrypted_payload`: JSON `{api_token: '...', zone_id: '...'}` encrypted.

---
### 2. Cloudflare Client Interface

**RULING 25: Cloudflare Client Interface**

```typescript
// lib/server/cloudflare.ts (server-side only)
import { DNSRecord } from './types'; // Define this type for Cloudflare API responses

export interface CloudflareClient {
  /**
   * Creates a CNAME DNS record in a specified Cloudflare zone.
   * @param zoneId The Cloudflare Zone ID.
   * @param name The record name (e.g., 'www', '@', 'subdomain').
   * @param target The CNAME target (e.g., 'our-edge-target.aibizconnect.app').
   * @param ttl TTL in seconds.
   * @returns The created DNS record.
   */
  createCnameRecord(zoneId: string, name: string, target: string, ttl: number): Promise<DNSRecord>;

  /**
   * Creates a TXT DNS record in a specified Cloudflare zone.
   * @param zoneId The Cloudflare Zone ID.
   * @param name The record name.
   * @param content The TXT record content.
   * @param ttl TTL in seconds.
   * @returns The created DNS record.
   */
  createTxtRecord(zoneId: string, name: string, content: string, ttl: number): Promise<DNSRecord>;

  /**
   * Deletes a DNS record from a specified Cloudflare zone.
   * @param zoneId The Cloudflare Zone ID.
   * @param recordId The ID of the DNS record to delete.
   */
  deleteRecord(zoneId: string, recordId: string): Promise<void>;

  /**
   * Lists DNS records in a specified Cloudflare zone, with optional filters.
   * @param zoneId The Cloudflare Zone ID.
   * @param type Optional: filter by record type (e.g., 'CNAME', 'TXT').
   * @param name Optional: filter by record name.
   * @returns An array of matching DNS records.
   */
  listRecords(zoneId: string, type?: string, name?: string): Promise<DNSRecord[]>;

  /**
   * Verifies the existence and content of a DNS record by performing an external DNS lookup.
   * This is for records *not* managed by our Cloudflare account.
   * @param domain The domain to query.
   * @param type The record type (e.g., 'CNAME', 'TXT').
   * @param name The record name.
   * @param value The expected record value.
   * @returns True if the record is found and matches, false otherwise.
   */
  verifyExternalDnsRecord(domain: string, type: string, name: string, value: string): Promise<boolean>;

  /**
   * Verifies that a domain's nameservers point to our designated Cloudflare nameservers.
   * @param domain The domain to verify.
   * @param expectedNameservers An array of our Cloudflare nameservers.
   * @returns True if nameservers match, false otherwise.
   */
  verifyNameservers(domain: string, expectedNameservers: string[]): Promise<boolean>;

  /**
   * Retrieves the Cloudflare Zone ID for a given domain, if it's already managed by our CF account.
   * @param domain The domain name.
   * @returns The Zone ID or null if not found/managed by us.
   */
  getZoneId(domain: string): Promise<string | null>;

  /**
   * Creates a new Cloudflare zone for a given domain under our account.
   * This implies we take over DNS management for this domain.
   * @param domain The domain name.
   * @returns The newly created Zone ID.
   */
  getOrCreateZone(domain: string): Promise<string>;
}
```

---
### 3. Domain Verification & Management Flow

**RULING 26: Domain Management Flow**

**A. Free Subdomain (`name.aibizconnect.app`)**
1.  **Step 4 (Subdomain Selection):**
    *   Tenant selects `name.aibizconnect.app`.
    *   A `tenant_domains` entry is created: `type='subdomain'`, `domain_name='name.aibizconnect.app'`, `website_id`, `is_primary=TRUE`, `status='pending_publish'`.
2.  **Step 7 (Publish):**
    *   Retrieve `PLATFORM_CLOUDFLARE_ZONE_ID` from `tenant_secrets` (using `PLATFORM_TENANT_ID`).
    *   Call `cloudflareClient.createCnameRecord(PLATFORM_CLOUDFLARE_ZONE_ID, <subdomain_name>, 'our-edge-target.aibizconnect.app', 1)`.
    *   Update `tenant_domains.status='active'`, `cloudflare_dns_records_created` with the record ID.
    *   Log to `platform_audit_log`.

**B. Custom Domain (Tenant-Provided)**
1.  **Tenant Action: `addCustomDomain(tenantId, websiteId, domainName)` (Server Action)**
    *   **Authorization:** `requireTenantAccess(tenantId)`.
    *   **Validation:** Validate `domainName` format.
    *   **DB:** Create `tenant_domains` entry: `type='custom'`, `domain_name`, `website_id`, `is_primary=FALSE` (initially), `status='pending_nameserver_update'`.
    *   **Response:** Return our Cloudflare nameservers (e.g., `ns1.aibizconnect.app`, `ns2.aibizconnect.app`) to the client.
    *   **Audit:** Log to `platform_audit_log`.
2.  **Tenant Action: `verifyCustomDomain(tenantId, domainId)` (Server Action)**
    *   **Authorization:** `requireTenantAccess(tenantId)`.
    *   **DB:** Retrieve `tenant_domains` entry by `domainId`.
    *   **Cloudflare:** Call `cloudflareClient.verifyNameservers(domain_name, our_nameservers)`.
    *   **Cloudflare:** If nameser