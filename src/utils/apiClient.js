/**
 * SAP CPI OData V2 API Client
 * Handles authentication (Basic Auth & OAuth2) and HTTP requests
 */
const axios = require("axios");

class CpiApiClient {
  constructor() {
    this.baseUrl = null;
    this.authType = null;
    this.credentials = {};
    this.axiosInstance = null;
  }

  /**
   * Initialize the client from environment variables (CF environment)
   */
  init() {
    // Support both VCAP_SERVICES (CF) and direct env vars
    if (process.env.VCAP_SERVICES) {
      try {
        const vcap = JSON.parse(process.env.VCAP_SERVICES);
        // Look for process-integration-runtime service binding
        const pir =
          vcap["process-integration-runtime"] ||
          vcap["it-rt"] ||
          vcap["SAP Process Integration Runtime"];
        if (pir && pir[0]) {
          // 'api' plan bindings nest everything under credentials.oauth
          const raw = pir[0].credentials || {};
          const creds = raw.oauth || raw;
          this.baseUrl = creds.url || creds.tmn_url;
          if (creds.clientid) {
            this.authType = "oauth";
            this.credentials = {
              clientId: creds.clientid,
              clientSecret: creds.clientsecret,
              tokenUrl: creds.tokenurl,
            };
          } else {
            this.authType = "basic";
            this.credentials = {
              username: creds.username,
              password: creds.password,
            };
          }
        }
      } catch (e) {
        // Fall through to env vars
      }
    }

    // Direct environment variable fallback
    if (!this.baseUrl) {
      this.baseUrl = process.env.CPI_BASE_URL;
    }
    if (!this.authType) {
      if (process.env.CPI_CLIENT_ID) {
        this.authType = "oauth";
        this.credentials = {
          clientId: process.env.CPI_CLIENT_ID,
          clientSecret: process.env.CPI_CLIENT_SECRET,
          tokenUrl: process.env.CPI_TOKEN_URL,
        };
      } else {
        this.authType = "basic";
        this.credentials = {
          username: process.env.CPI_USERNAME,
          password: process.env.CPI_PASSWORD,
        };
      }
    }

    if (!this.baseUrl) {
      throw new Error(
        "CPI_BASE_URL not configured. Set via VCAP_SERVICES or CPI_BASE_URL env var."
      );
    }

    // Strip trailing slash
    this.baseUrl = this.baseUrl.replace(/\/$/, "");

    this._buildAxiosInstance();
  }

  _buildAxiosInstance() {
    const config = {
      baseURL: `${this.baseUrl}/api/v1`,
      timeout: parseInt(process.env.CPI_TIMEOUT_MS || "30000"),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };

    if (this.authType === "basic") {
      config.auth = {
        username: this.credentials.username,
        password: this.credentials.password,
      };
    }

    this.axiosInstance = axios.create(config);

    // OAuth2 interceptor
    if (this.authType === "oauth") {
      let tokenCache = { token: null, expiresAt: 0 };

      this.axiosInstance.interceptors.request.use(async (reqConfig) => {
        if (!tokenCache.token || Date.now() >= tokenCache.expiresAt - 30000) {
          const params = new URLSearchParams();
          params.append("grant_type", "client_credentials");
          params.append("client_id", this.credentials.clientId);
          params.append("client_secret", this.credentials.clientSecret);

          const resp = await axios.post(this.credentials.tokenUrl, params);
          tokenCache.token = resp.data.access_token;
          tokenCache.expiresAt =
            Date.now() + (resp.data.expires_in || 3600) * 1000;
        }
        reqConfig.headers["Authorization"] = `Bearer ${tokenCache.token}`;
        return reqConfig;
      });
    }
  }

  /**
   * GET /api/v1/<path>
   */
  async get(path, params = {}) {
    const resp = await this.axiosInstance.get(path, { params });
    return resp.data?.d || resp.data;
  }

  /**
   * POST /api/v1/<path>
   */
  async post(path, body = {}, params = {}) {
    // Fetch CSRF token first
    const csrfResp = await this.axiosInstance.get("/", {
      headers: { "X-CSRF-Token": "Fetch" },
    });
    const csrfToken = csrfResp.headers["x-csrf-token"];

    const resp = await this.axiosInstance.post(path, body, {
      params,
      headers: { "X-CSRF-Token": csrfToken },
    });
    return resp.data?.d || resp.data;
  }

  /**
   * DELETE /api/v1/<path>
   */
  async delete(path, params = {}) {
    const csrfResp = await this.axiosInstance.get("/", {
      headers: { "X-CSRF-Token": "Fetch" },
    });
    const csrfToken = csrfResp.headers["x-csrf-token"];

    const resp = await this.axiosInstance.delete(path, {
      params,
      headers: { "X-CSRF-Token": csrfToken },
    });
    return resp.data?.d || resp.data;
  }

  /**
   * Build OData filter query string helpers
   */
  buildQuery(options = {}) {
    const q = {};
    if (options.top) q["$top"] = options.top;
    if (options.skip) q["$skip"] = options.skip;
    if (options.filter) q["$filter"] = options.filter;
    if (options.orderby) q["$orderby"] = options.orderby;
    if (options.select) q["$select"] = options.select;
    if (options.expand) q["$expand"] = options.expand;
    if (options.inlinecount) q["$inlinecount"] = "allpages";
    return q;
  }
}

const client = new CpiApiClient();
module.exports = client;
