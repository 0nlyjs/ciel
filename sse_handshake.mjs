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
const sseUrl = `https://api.corsair.dev/mcp/a40a23e3d0c047309eedc84dd48fc6d7?tenantId=${encodeURIComponent(tenantId)}`;

async function run() {
  console.log("Fetching SSE URL:", sseUrl);
  
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "X-Corsair-Tenant-Id": tenantId,
    Accept: "text/event-stream",
  };

  const response = await fetch(sseUrl, { headers });
  console.log("Status:", response.status);
  console.log("Headers:", Object.fromEntries(response.headers.entries()));
  console.log("Body:", await response.text());
}

run().catch(console.error);
