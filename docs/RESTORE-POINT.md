# Restore Point — pre-assembly-generator (2026-06-13)

Before pivoting to the Relume-style **direct-assembly** website generator, the complete
working system was snapshotted **three independent ways** so we can always go back.

## What's backed up (the whole working system)
- Native-elements **editor + importer** (data-cs fidelity, gradient capture, contrast
  guard, footer/©, native-elements-only translation).
- **14 harvested prebuilt sections** + the structured Stitch prompt builder (D-287).
- **AI Agents hub** (skills: calendar/contacts/email/sms; public chat widget; test-drive
  gate; token metering; knowledge intake; conversation storage).
- **Marketing** email campaigns (drafts-only, Resend-gated).
- **Team + franchise** organizations.
- Calendars / Contacts / CRM / tags + custom fields.
- **Resend email LIVE** (sender hello@aibizconnect.app verified).
- All DDL applied through **0056**.

## The three backups (any one restores everything)

### 1. Git tag (canonical) — on GitHub
```
v1.0-pre-assembly-generator-20260613   (commit f969f46)
```
Roll the working tree back to it:
```
git checkout v1.0-pre-assembly-generator-20260613      # detached, to inspect
# or, to make it the live branch again:
git checkout -b restore-known-good v1.0-pre-assembly-generator-20260613
```
The tag is pushed to `origin` (GitHub) — survives a lost laptop.

### 2. Off-repo full-history bundle — independent of GitHub
```
C:\server\backups\aibizconnect-frontend-FULL-20260613.bundle   (60 MB, verified OK)
```
A single self-contained file with the ENTIRE repo history. Restore from it even with no
GitHub access:
```
git clone C:\server\backups\aibizconnect-frontend-FULL-20260613.bundle recovered-repo
```

### 3. OneDrive mirror (automatic)
The working dir auto-mirrors to OneDrive via the post-commit hook (see
[[working-directory]] memory), so the tagged commit is also in the OneDrive copy.

## Data (Supabase) note
Code is fully backed up above. The **database** (tenants, websites, contacts, agents,
campaigns) lives in Supabase — its own provider backups apply. Tenant website CONTENT was
additionally exported to `backups/websites-full-backup-20260612.json` and the ABC mirror
zip. The assembly-generator pivot is ADDITIVE (a new generation path) and does not migrate
or drop any existing table, so no data rollback is expected to be needed.

## Rule
The new direct-assembly generator must be built as a **new, additive path** — it must not
modify the existing editor or importer (Ali's law). If anything regresses, `git checkout`
the tag above and we're exactly back to this verified state.
