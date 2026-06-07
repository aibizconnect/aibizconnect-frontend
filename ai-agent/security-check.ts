import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { loadAgentConfig } from "./config/loadConfig";
import { loadVault } from "./config/loadVault";

const LOG_DIR = path.join(process.cwd(), "ai-agent-logs");
const APPROVAL_QUEUE_FILE = path.join(LOG_DIR, "approval-queue.json");

function exists(p: string) {
  return fs.existsSync(p);
}

function readJSON(p: string) {
  if (!exists(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function safeExec(cmd: string) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

export async function runDailySecurityCheck() {
  const config = loadAgentConfig();
  const vault = loadVault();

  const report: any = {
    timestamp: new Date().toISOString(),
    supabase: {},
    vercel: {},
    github: {},
    cloudflare: {},
    agent: {},
    warnings: [],
    errors: []
  };

  // --- LOCAL AGENT CHECKS ---
  report.agent.logsDirectoryExists = exists(LOG_DIR);
  report.agent.configDirectoryExists = exists("ai-agent/config");
  report.agent.keysDirectoryExists = exists("ai-agent/keys");

  const queue = readJSON(APPROVAL_QUEUE_FILE) || [];
  report.agent.pendingApprovals = queue.length;

  if (queue.length > 0) {
    report.warnings.push("There are pending destructive actions requiring Ali's approval.");
  }

  // --- SUPABASE CHECKS ---
  const supabaseUrl = vault.get("SUPABASE_URL");
  const supabaseKey = vault.get("SUPABASE_SERVICE_ROLE");

  if (!supabaseUrl || !supabaseKey) {
    report.supabase.error = "Missing Supabase credentials in vault.";
  } else {
    const tables = safeExec("supabase db list");
    report.supabase.tables = tables || "UNKNOWN";

    const policies = safeExec("supabase db policies list");
    report.supabase.policies = policies || "UNKNOWN";

    if (policies && policies.includes("public")) {
      report.warnings.push("Supabase: One or more tables appear to be publicly accessible.");
    }
  }

  // --- VERCEL CHECKS ---
  const vercelToken = vault.get("VERCEL_TOKEN");
  const vercelProject = vault.get("VERCEL_PROJECT_ID");

  if (!vercelToken || !vercelProject) {
    report.vercel.error = "Missing Vercel credentials in vault.";
  } else {
    const envList = safeExec(`VERCEL_TOKEN=${vercelToken} vercel env ls --project ${vercelProject}`);
    report.vercel.env = envList || "UNKNOWN";

    if (envList && envList.includes("Missing")) {
      report.warnings.push("Vercel: Missing environment variables detected.");
    }
  }

  // --- GITHUB CHECKS ---
  const uncommitted = safeExec("git status --porcelain");
  const unpushed = safeExec("git cherry -v");

  report.github.uncommittedChanges = uncommitted || "NONE";
  report.github.unpushedCommits = unpushed || "NONE";

  if (uncommitted) {
    report.warnings.push("GitHub: There are uncommitted changes.");
  }
  if (unpushed) {
    report.warnings.push("GitHub: There are unpushed commits.");
  }

  // --- CLOUDFLARE CHECKS ---
  const cfToken = vault.get("CLOUDFLARE_API_TOKEN");
  const cfZone = vault.get("CLOUDFLARE_ZONE_ID");

  if (!cfToken || !cfZone) {
    report.cloudflare.error = "Missing Cloudflare credentials in vault.";
  } else {
    // DNS Records
    const dnsRaw = safeExec(
      `curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${cfZone}/dns_records" -H "Authorization: Bearer ${cfToken}" -H "Content-Type: application/json"`
    );

    if (!dnsRaw) {
      report.errors.push("Cloudflare: Unable to fetch DNS records.");
    } else {
      try {
        const dns = JSON.parse(dnsRaw);
        report.cloudflare.dnsRecords = dns.result || [];
        if (!dns.success) {
          report.errors.push("Cloudflare: DNS records API returned an error.");
        } else if (dns.result.length === 0) {
          report.warnings.push("Cloudflare: No DNS records found for this zone.");
        }
      } catch {
        report.errors.push("Cloudflare: Failed to parse DNS records response.");
      }
    }

    // Firewall Rules
    const fwRaw = safeExec(
      `curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${cfZone}/firewall/rules" -H "Authorization: Bearer ${cfToken}" -H "Content-Type: application/json"`
    );

    if (!fwRaw) {
      report.errors.push("Cloudflare: Unable to fetch firewall rules.");
    } else {
      try {
        const fw = JSON.parse(fwRaw);
        report.cloudflare.firewallRules = fw.result || [];
        if (fw.result && fw.result.length === 0) {
          report.warnings.push("Cloudflare: No firewall rules configured.");
        }
      } catch {
        report.errors.push("Cloudflare: Failed to parse firewall rules response.");
      }
    }

    // Zone Settings (SSL, security level, threat score, etc.)
    const settingsRaw = safeExec(
      `curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${cfZone}/settings" -H "Authorization: Bearer ${cfToken}" -H "Content-Type: application/json"`
    );

    if (!settingsRaw) {
      report.errors.push("Cloudflare: Unable to fetch zone settings.");
    } else {
      try {
        const settings = JSON.parse(settingsRaw);
        if (!settings.success) {
          report.errors.push("Cloudflare: Zone settings API returned an error.");
        } else {
          const items: any[] = settings.result || [];
          const get = (id: string) => items.find((s: any) => s.id === id)?.value ?? "UNKNOWN";

          report.cloudflare.ssl = get("ssl");
          report.cloudflare.securityLevel = get("security_level");
          report.cloudflare.minTlsVersion = get("min_tls_version");
          report.cloudflare.alwaysUseHttps = get("always_use_https");
          report.cloudflare.browserIntegrityCheck = get("browser_check");

          if (report.cloudflare.ssl === "off") {
            report.errors.push("Cloudflare: SSL is disabled for this zone.");
          }
          if (report.cloudflare.alwaysUseHttps === "off") {
            report.warnings.push("Cloudflare: 'Always Use HTTPS' is disabled.");
          }
          if (report.cloudflare.securityLevel === "essentially_off" || report.cloudflare.securityLevel === "off") {
            report.warnings.push("Cloudflare: Security level is set to off or essentially off.");
          }
        }
      } catch {
        report.errors.push("Cloudflare: Failed to parse zone settings response.");
      }
    }

    // API Token Validation
    const authRaw = safeExec(
      `curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" -H "Authorization: Bearer ${cfToken}" -H "Content-Type: application/json"`
    );

    if (!authRaw) {
      report.errors.push("Cloudflare: Unable to validate API token.");
    } else {
      try {
        const auth = JSON.parse(authRaw);
        report.cloudflare.tokenValid = auth.success === true;
        if (!auth.success) {
          report.errors.push("Cloudflare: API token is invalid or expired.");
        }
      } catch {
        report.errors.push("Cloudflare: Failed to parse token validation response.");
      }
    }
  }

  // --- FILE INTEGRITY ---
  const criticalFiles: string[] = config.security.criticalFiles;
  report.agent.missingCriticalFiles = criticalFiles.filter(f => !exists(f));

  if (report.agent.missingCriticalFiles.length > 0) {
    report.errors.push("Critical agent files are missing.");
  }

  // Write report
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const reportPath = path.join(LOG_DIR, `security-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  return report;
}

// CLI mode
if (require.main === module) {
  runDailySecurityCheck().then(report => {
    console.log(JSON.stringify(report, null, 2));
  });
}
