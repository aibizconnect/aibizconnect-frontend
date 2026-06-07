import http from "http";
import { runAgentCommand } from "./agent";
import { loadAgentConfig } from "./config/loadConfig";

const config = loadAgentConfig();
const PORT = process.env.AI_AGENT_PORT
  ? parseInt(process.env.AI_AGENT_PORT, 10)
  : config.httpPort;

function sendJSON(res: http.ServerResponse, status: number, body: any) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/run-command") {
    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");

        if (!parsed.command) {
          return sendJSON(res, 400, {
            success: false,
            error: "Missing 'command' field."
          });
        }

        const id = parsed.id || `cmd_${Date.now()}`;

        const result = await runAgentCommand({
          id,
          command: parsed.command,
          cwd: parsed.cwd,
          meta: parsed.meta
        });

        return sendJSON(res, 200, {
          success: true,
          result
        });
      } catch (err: any) {
        return sendJSON(res, 500, {
          success: false,
          error: err.message
        });
      }
    });

    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    return sendJSON(res, 200, {
      ok: true,
      message: "AI Agent server is running."
    });
  }

  sendJSON(res, 404, {
    success: false,
    error: "Not found"
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`AI Agent server listening on http://localhost:${PORT}`);
  });
}

export default server;
