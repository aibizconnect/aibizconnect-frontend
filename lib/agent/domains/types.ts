import type { Domain } from "../v1-format";

/**
 * DomainSpec — the contract every Agent Mesh domain implements (E-1, ratified).
 *
 * The supervisor's pipeline (pre-commit -> execute -> reflect) keys off this shape:
 *   validate()  -> structural/whitelist gate feeding Plan-Validation (D)
 *   dryRun()    -> always-safe simulation; MANDATORY before a domain may go live (S-2)
 *   execute()   -> live writes (only when allowLive AND the domain is liveEnabled)
 *
 * A domain is a stub until it ships validate+dryRun. Live execution additionally
 * requires `liveEnabled` AND a proven dry-run. Actions that spend money, send a
 * message, or place a call MUST be declared in `gatedActions` so the supervisor
 * raises a G (human-approval) breakpoint before they run (S-1).
 */

export type DomainCapability = "build" | "analyze" | "send" | "spend" | "call";

export interface DomainContext {
  tenantId: string;
  userId?: string;
  /** Service-role-gated writer is provided by the executor layer, not the domain. */
  dryRun: boolean;
}

export interface DomainValidation {
  ok: boolean;
  /** Human-readable structural/whitelist violations (feed Plan-Validation D). */
  violations: string[];
  /** Action ids that require human approval before live execution (G). */
  gatedActionIds: string[];
}

export interface DomainExecutionResult {
  ok: boolean;
  dryRun: boolean;
  /** Per-action outcomes (id -> summary), mirrors the website engine's shape. */
  results: Array<{ id: string; type: string; status: "ok" | "dry" | "blocked" | "error"; detail?: string }>;
  error?: string;
}

export interface DomainSpec {
  domain: Domain;
  label: string;
  /** Whitelisted action types this domain accepts. */
  actionWhitelist: readonly string[];
  /** Action types that are irreversible/cost actions -> always G-gated (S-1). */
  gatedActionTypes: readonly string[];
  capabilities: readonly DomainCapability[];
  /** Stub domains register but cannot run live until this flips true (after a dry-run). */
  liveEnabled: boolean;
  /** True once a dry-run has been demonstrated + logged (S-2 mandate). */
  dryRunProven: boolean;

  describe(): { domain: Domain; label: string; actions: readonly string[]; capabilities: readonly DomainCapability[]; liveEnabled: boolean; dryRunProven: boolean };
  validate(plan: unknown): DomainValidation;
  dryRun(plan: unknown, ctx: DomainContext): Promise<DomainExecutionResult>;
  execute(plan: unknown, ctx: DomainContext): Promise<DomainExecutionResult>;
}
