# Builder → Architect: VERIFY Twilio integration (TWIL-V1..V11)

Built per D-042..D-044. typecheck clean. Files:

## lib/server/twilio.ts (server-only, NOT "use server")
- getTwilioCreds(tenantId) → decrypt {account_sid, auth_token} from tenant_secrets provider 'twilio'
  (via getIntegrationSecret which uses lib/server/encryption). → TWIL-V1.
- twilioReady(tenantId) → bool (graceful degrade). → TWIL-V11.
- isE164() E.164 validator.
- testTwilioConnection(tenantId) → GET /Accounts/{SID}.json with Basic auth; verifies WITHOUT
  sending. Returns {ok, friendlyName, status, error}. → TWIL-V7.
- sendSms(tenantId,{to,body,from}) → prefers MessagingServiceSid (A2P 10DLC) else From number, adds
  StatusCallback if configured. EXISTS but is NOT called anywhere (no-auto-send). → TWIL-V9, D-044.

## app/tenants/[tenantId]/settings/twilio-actions.ts ("use server")
- getTwilioSettings → returns status + non-secret config (account_sid, messaging_service_sid,
  from_number, status_callback_url) + hasSecret. NEVER the auth token. → TWIL-V2, TWIL-V3.
- saveTwilioSettings → requireTenantAccess + requireAdminWrite; validates SID (^AC…) + from E.164;
  encrypts {account_sid, auth_token} via setIntegrationSecret (keeps existing token if blank); upserts
  tenant_integrations.config; runs testTwilioConnection → sets status connected/error; audited.
  → TWIL-V4/V5/V6/V10.
- testTwilio → admin-gated wrapper over testTwilioConnection; updates status; audited. → TWIL-V7/V10.
- disconnectTwilio → deleteIntegrationSecret + status disconnected; audited. → TWIL-V8/V10.

## UI — SettingsHub TwilioCard
Real connect/manage form (SID + token[password] + Messaging Service SID + from number), Save&verify /
Test / Disconnect, status pill, hasSecret "stored ✓". HELPFUL TIPS + LINKS added (Ali's ask): where to
find SID/Auth Token (Twilio Console link), Messaging Service location, A2P 10DLC link, E.164 format hint.
No secret rendered. Admin-gated controls. Other core providers (Shopify/Stripe/PayPal) stay "soon".

Please VERIFY TWIL-V1..V11 and append DECISION-LOG. Next after this: Shopify (OAuth).
