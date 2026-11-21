# SAP CPI MCP Server

An MCP (Model Context Protocol) server exposing **all SAP Cloud Integration OData V2 API** entity sets as tools for AI agents (Claude, etc.).

Deployable locally (stdio) or on **SAP BTP Cloud Foundry** (HTTP SSE).

---

## Tools Included

| Category | Tools |
|---|---|
| **Message Processing Logs** | Get logs, run steps, store entries, ID mapper, idempotent repository |
| **Integration Content** | Packages, design-time & runtime artifacts, deploy, undeploy, service endpoints, data stores, variables |
| **Security Content** | User credentials, OAuth2 credentials, OAuth2 token providers, secure parameters, keystores, SSH keys, cert-user mappings, number ranges |
| **Partner Directory** | Partners, string params, binary params, alternative partners, authorized users |
| **JMS / Message Stores** | JMS brokers, resources, message queues, subscriptions, system log files |
| **Generic OData** | Raw query any entity set, fetch API metadata, list entity sets |

**Total: 50+ tools**

---

## Quick Start (Local)

```bash
cd sap-cpi-mcp-server
npm install
cp .env.example .env
# edit .env with your CPI URL + credentials
node src/index.js
```

### Claude Desktop config (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "sap-cpi": {
      "command": "node",
      "args": ["/absolute/path/to/sap-cpi-mcp-server/src/index.js"],
      "env": {
        "CPI_BASE_URL": "https://your-tenant.it-cpi001.cfapps.eu10.hana.ondemand.com",
        "CPI_USERNAME": "your_user",
        "CPI_PASSWORD": "your_password",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

---

## Deploy to SAP BTP Cloud Foundry

### Option A — cf push (Basic/OAuth env vars)

1. Edit `manifest.yml` — uncomment your auth option and fill in values.
2. Push:
```bash
cf login -a https://api.cf.eu10.hana.ondemand.com
cf push
```

### Option B — cf push with process-integration-runtime service binding (recommended)

1. Create the service instance (if not already):
```bash
cf create-service process-integration-runtime api cpi-runtime-instance
```

2. Uncomment the `services:` block in `manifest.yml`.

3. Push:
```bash
cf push
```
The app reads credentials automatically from `VCAP_SERVICES` — no env vars needed.

### Option C — MTA build & deploy

```bash
npm install -g mbt
mbt build
cf deploy mta_archives/sap-cpi-mcp-server_1.0.0.mtar
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `CPI_BASE_URL` | CPI tenant management node URL | Yes (unless VCAP_SERVICES) |
| `CPI_USERNAME` | Basic Auth username | Option A |
| `CPI_PASSWORD` | Basic Auth password | Option A |
| `CPI_CLIENT_ID` | OAuth2 client ID | Option B |
| `CPI_CLIENT_SECRET` | OAuth2 client secret | Option B |
| `CPI_TOKEN_URL` | OAuth2 token endpoint | Option B |
| `MCP_TRANSPORT` | `stdio` or `http` | No (default: http on CF, stdio locally) |
| `MCP_ACCESS_TOKEN` | Secret path segment protecting the HTTP endpoints | Recommended |
| `PORT` | HTTP port for SSE mode | No (default: 8080) |
| `CPI_TIMEOUT_MS` | Request timeout ms | No (default: 30000) |

---

## Required CPI Roles

Your user/OAuth client needs:
- `PI_Read_Only` — for all GET operations
- `PI_Integration_Developer` — for deploy/undeploy
- `PI_Administrator` — for security content CRUD
- `AuthGroup_BusinessExpert` — for data stores, partner directory

---

## Health Check

After deployment:
```
GET https://your-app.cfapps.eu10.hana.ondemand.com/health
```

Returns:
```json
{
  "status": "ok",
  "server": "sap-cpi-mcp-server",
  "version": "1.0.0",
  "tools": 52,
  "cpi_base_url": "https://your-tenant...",
  "auth_type": "oauth"
}
```

---

## MCP SSE Endpoints (BTP CF)

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check |
| `/mcp` | POST | **Streamable HTTP — use this URL for Claude connectors** |
| `/sse` | GET | Legacy SSE connection (older clients) |
| `/messages?sessionId=<id>` | POST | Legacy SSE message posting |

If `MCP_ACCESS_TOKEN` is set, the endpoints become `/mcp/<token>` and `/sse/<token>`.

### Connect from Claude
Settings → Connectors → Add custom connector → URL:
`https://<your-app-route>/mcp` (or `/mcp/<token>`), no sign-in.
