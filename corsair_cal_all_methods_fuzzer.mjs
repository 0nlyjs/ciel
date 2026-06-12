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

const methods = [
  "list", "listEvents", "list_events", "listall", "listAll", "listEvent", "list_event",
  "getEvents", "get_events", "getEvent", "get_event",
  "all", "allEvents", "all_events",
  "retrieve", "retrieveEvents", "retrieve_events", "retrieveEvent", "retrieve_event",
  "find", "findEvents", "find_events", "findEvent", "find_event",
  "search", "searchEvents", "search_events", "searchEvent", "search_event",
  "query", "queryEvents", "query_events", "queryEvent", "query_event",
  "fetch", "fetchEvents", "fetch_events", "fetchEvent", "fetch_event",
  "index", "indexEvents", "index_events", "indexEvent", "index_event"
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

  for (const m of methods) {
    const path = `googlecalendar.api.events.${m}`;
    try {
      const res = await t.run(path, {});
      console.log(`Path: ${path} -> REGISTERED (Success):`, JSON.stringify(res));
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
