import { createClient } from "@corsair-dev/app";
import fs from "fs";

const envFile = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envFile.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const parts = trimmed.split("=");
    const key = parts[0].trim();
    let val = parts.slice(1).join("=").trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
}

const apiKey = env.CORSAIR_DEV_KEY || env.CORSAIR_API_KEY;
const tenantId = "mistrenderx@gmail.com";

const pathsToTest = [
  // Gmail
  "gmail.api.messages.list",
  "gmail.api.users.messages.list",
  "gmail.api.messages.get",
  "gmail.api.users.messages.get",
  "gmail.api.messages.send",
  "gmail.api.users.messages.send",
  "gmail.api.drafts.create",
  "gmail.api.users.drafts.create",
  "gmail.api.drafts.send",
  "gmail.api.users.drafts.send",
  
  // Google Calendar
  "googlecalendar.api.events.list",
  "googlecalendar.api.calendar.events.list",
  "googlecalendar.api.events.insert",
  "googlecalendar.api.calendar.events.insert",
  "googlecalendar.api.calendarList.list",
];

async function run() {
  const corsair = createClient({ apiKey });
  const { instances } = await corsair.instances.list();
  const activeInstance = instances.find(inst => inst.status === "active") || instances[0];
  if (!activeInstance) {
    console.log("No active instances found!");
    return;
  }

  const t = corsair.instance(activeInstance.id).tenant(tenantId);

  for (const path of pathsToTest) {
    try {
      const res = await t.run(path, {});
      console.log(`Path: ${path} -> SUCCESS (should not happen without input):`, JSON.stringify(res));
    } catch (e) {
      if (e.message.includes("No operation registered")) {
        // console.log(`Path: ${path} -> NOT REGISTERED`);
      } else {
        console.log(`Path: ${path} -> REGISTERED (Error: ${e.message})`);
      }
    }
  }
}

run().catch(console.error);
