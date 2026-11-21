/**
 * SAP CPI OData V2 MCP Server
 * Covers: Message Processing Logs, Integration Content, Security Content,
 *         Partner Directory, JMS/Message Stores, Generic OData queries
 *
 * Transports:
 *   stdio            — local (Claude Desktop / Claude Code)       MCP_TRANSPORT=stdio
 *   Streamable HTTP  — remote, used by Claude connectors   POST  /mcp
 *   SSE (legacy)     — older remote clients                GET   /sse + POST /messages
 *
 * Config via: VCAP_SERVICES (CF binding) or CPI_* environment variables
 * Optional:   MCP_ACCESS_TOKEN — if set, the HTTP endpoints move to /mcp/<token>
 *             and /sse/<token>, so only someone with the full URL can connect.
 */

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const express = require("express");
const { z } = require("zod");

const apiClient = require("./utils/apiClient");

const allTools = [
  ...require("./tools/messageLogs"),
  ...require("./tools/integrationContent"),
  ...require("./tools/securityContent"),
  ...require("./tools/partnerDirectory"),
  ...require("./tools/messagingResources"),
  ...require("./tools/genericOdata"),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonSchemaToZod(schema) {
  if (!schema || !schema.properties) return {};
  const required = new Set(schema.required || []);
  const shape = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    let t;
    if (prop.type === "number") t = z.number();
    else if (prop.type === "boolean") t = z.boolean();
    else if (prop.type === "array") t = z.array(z.any());
    else if (prop.enum) t = z.enum(prop.enum);
    else t = z.string();
    if (prop.description) t = t.describe(prop.description);
    shape[key] = required.has(key) ? t : t.optional();
  }
  return shape;
}

/** Build a new McpServer with every tool registered. */
function buildServer() {
  const server = new McpServer({ name: "sap-cpi-mcp-server", version: "1.1.0" });

  for (const tool of allTools) {
    server.tool(tool.name, tool.description, jsonSchemaToZod(tool.inputSchema), async (args) => {
      try {
        const result = await tool.handler(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const status = err?.response?.status;
        const body = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
        return {
          content: [{ type: "text", text: `Error${status ? ` (HTTP ${status})` : ""}: ${body}` }],
          isError: true,
        };
      }
    });
  }
  return server;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    apiClient.init();
    console.error(`[cpi-mcp] CPI: ${apiClient.baseUrl} (auth: ${apiClient.authType})`);
  } catch (err) {
    console.error(`[cpi-mcp] WARNING: ${err.message}`);
  }

  // On CF, PORT is always set — default to HTTP there even if MCP_TRANSPORT is missing
  const mode = process.env.MCP_TRANSPORT || (process.env.PORT ? "http" : "stdio");

  if (mode === "stdio") {
    await buildServer().connect(new StdioServerTransport());
    console.error(`[cpi-mcp] stdio server started — ${allTools.length} tools`);
    return;
  }

  const app = express();
  app.use(express.json({ limit: "10mb" }));

  const token = process.env.MCP_ACCESS_TOKEN;
  const suffix = token ? `/${token}` : "";
  const mcpPath = `/mcp${suffix}`;
  const ssePath = `/sse${suffix}`;
  const msgPath = `/messages${suffix}`;

  // Health (never exposes secrets)
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      server: "sap-cpi-mcp-server",
      version: "1.1.0",
      tools: allTools.length,
      cpi_base_url: apiClient.baseUrl || "not configured",
      auth_type: apiClient.authType || "not configured",
      mcp_endpoint: token ? "/mcp/<token>" : "/mcp",
    });
  });

  // ── Streamable HTTP (stateless): one server + transport per request ─────────
  app.post(mcpPath, async (req, res) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("[cpi-mcp] /mcp error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  // Stateless mode has no server-initiated stream or sessions to delete
  const notAllowed = (_req, res) =>
    res.status(405).set("Allow", "POST").json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    });
  app.get(mcpPath, notAllowed);
  app.delete(mcpPath, notAllowed);

  // ── Legacy SSE ──────────────────────────────────────────────────────────────
  const sseTransports = {};
  app.get(ssePath, async (_req, res) => {
    const t = new SSEServerTransport(msgPath, res);
    sseTransports[t.sessionId] = t;
    res.on("close", () => delete sseTransports[t.sessionId]);
    await buildServer().connect(t);
  });
  app.post(msgPath, async (req, res) => {
    const t = sseTransports[req.query.sessionId];
    if (!t) return res.status(404).json({ error: "Session not found" });
    await t.handlePostMessage(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || "8080");
  app.listen(port, () => {
    console.error(`[cpi-mcp] HTTP server on :${port} — ${allTools.length} tools`);
    console.error(`[cpi-mcp] Streamable HTTP: POST ${token ? "/mcp/<token>" : "/mcp"}`);
    console.error(`[cpi-mcp] Legacy SSE:      GET  ${token ? "/sse/<token>" : "/sse"}`);
  });
}

main().catch((err) => {
  console.error("[cpi-mcp] Fatal:", err);
  process.exit(1);
});
