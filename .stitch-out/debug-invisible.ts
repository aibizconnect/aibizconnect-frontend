import { assemblePage, type AssemblyProfile } from "../lib/sites/assembly-generator";
import { inspectPage } from "../lib/sites/inspector";
const P = "d723a086-eac0-4b61-8742-25313370d0b7";
const profile: AssemblyProfile = { businessName: "AI Biz Connect", industry: "AI business OS", brandPrimary: "#0950c3" };
(async () => {
  const sections = await assemblePage(profile, { slug: "home", title: "Home", pageType: "home" }, P);
  const report = await inspectPage(sections as any, null, { checkImages: false });
  for (const i of report.issues.filter((x:any)=>x.code==="text-invisible")) console.log(`${i.where}: ${i.message}`);
})();
