import { twilioReady, sendSms, testTwilioConnection } from "../lib/server/twilio";
const ALI = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const TEST = "d723a086-eac0-4b61-8742-25313370d0b7";
(async () => {
  for (const [label, t] of [["AIBizConnect Consulting", ALI], ["test tenant", TEST]] as const) {
    const ready = await twilioReady(t);
    console.log(`${label}: twilioReady=${ready}`);
    if (ready) {
      const conn = await testTwilioConnection(t);
      console.log(`  account: ${JSON.stringify(conn)}`);
      const r = await sendSms(t, { to: "+14167277111", body: "AIBizConnect test ✅ — your Twilio SMS channel is live. Hour-before appointment reminders will arrive like this." });
      console.log(`  send: ${JSON.stringify(r)}`);
      return;
    }
  }
  console.log("No tenant has Twilio connected yet.");
})();
