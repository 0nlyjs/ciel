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
  console.log("1. Sending POST handshake to SSE URL:", sseUrl);
  
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "X-Corsair-Tenant-Id": tenantId,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };

  const response = await fetch(sseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    console.error("Failed handshake:", response.status, await response.text());
    return;
  }

  const mcpSessionId = response.headers.get("mcp-session-id");
  console.log("Handshake successful. mcp-session-id:", mcpSessionId);

  // Consume post body
  const initResult = await response.text();
  console.log("Initialize Response Body:", initResult);

  // Send tools/list POST request to the SAME URL, but with the mcp-session-id header
  console.log("2. Sending tools/list POST request...");
  const listPayload = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  };

  const postRes = await fetch(sseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Corsair-Tenant-Id": tenantId,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "mcp-session-id": mcpSessionId,
    },
    body: JSON.stringify(listPayload)
  });

  console.log("POST Response status:", postRes.status);
  const postDataText = await postRes.text();
  console.log("POST Response Body (Text):\n", postDataText);
}

run().catch(console.error);
