/**
 * AIBizConnect scheduler worker (D-257): every 15 minutes, hit the app's cron routes with
 * the shared secret. Each route is idempotent server-side, so retries/overlaps are safe.
 */
const ROUTES = ["/api/cron/appointment-reminders", "/api/cron/followups"];

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(Promise.all(ROUTES.map(async (path) => {
      try {
        const res = await fetch(`${env.APP_BASE}${path}`, {
          headers: { "x-cron-secret": env.CRON_SECRET ?? "" },
        });
        console.log(`${path} -> ${res.status}`);
      } catch (e) {
        console.log(`${path} -> error ${e?.message ?? e}`);
      }
    })));
  },
};
