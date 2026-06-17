import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/platform-admin";

/**
 * /start — public funnel (D-378). It no longer provisions anything anonymously. A visitor is routed
 * into the real flow: sign up/in, then the authenticated create-workspace step (/onboarding) which
 * creates a tenant tied to their account. (Marketing teaser content can live here later.)
 */
export default async function StartPage() {
  const user = await getCurrentUser();
  redirect(user ? "/onboarding" : "/login?next=/onboarding");
}
