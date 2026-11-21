/**
 * Security Content API tools
 * Entity sets: UserCredentials, OAuth2ClientCredentials, OAuth2TokenProviders,
 *   CertificateToUserMappings, KeyPairCertificateToUserMappings,
 *   SSHKeys, SecureParameters, Keystores, KeystoreEntries,
 *   NumberRanges
 */
const client = require("../utils/apiClient");

const tools = [
  // ─── User Credentials ─────────────────────────────────────────────────────
  {
    name: "cpi_get_user_credentials",
    description:
      "List all User Credential security artifacts (name + description only — no passwords returned).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Get a specific credential by name" },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      if (args.name) {
        return client.get(`/UserCredentials('${args.name}')`);
      }
      const params = client.buildQuery({ top: args.top || 50 });
      return client.get("/UserCredentials", params);
    },
  },

  {
    name: "cpi_create_user_credential",
    description: "Create a new User Credential security material.",
    inputSchema: {
      type: "object",
      required: ["name", "user", "password"],
      properties: {
        name: { type: "string", description: "Credential name (alias)" },
        user: { type: "string", description: "Username" },
        password: { type: "string", description: "Password" },
        description: { type: "string" },
        security_artifact_descriptor: {
          type: "string",
          description: "Type e.g. 'default'",
          default: "default",
        },
      },
    },
    handler: async (args) => {
      return client.post("/UserCredentials", {
        Name: args.name,
        User: args.user,
        Password: args.password,
        Description: args.description || "",
        SecurityArtifactDescriptor: {
          Type: args.security_artifact_descriptor || "default",
        },
      });
    },
  },

  {
    name: "cpi_delete_user_credential",
    description: "Delete a User Credential security artifact.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } },
    },
    handler: async (args) => {
      return client.delete(`/UserCredentials('${args.name}')`);
    },
  },

  // ─── OAuth2 Client Credentials ────────────────────────────────────────────
  {
    name: "cpi_get_oauth2_credentials",
    description: "List all OAuth2 Client Credential security artifacts.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Get specific OAuth2 credential by name" },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      if (args.name) {
        return client.get(`/OAuth2ClientCredentials('${args.name}')`);
      }
      const params = client.buildQuery({ top: args.top || 50 });
      return client.get("/OAuth2ClientCredentials", params);
    },
  },

  {
    name: "cpi_create_oauth2_credential",
    description: "Create a new OAuth2 Client Credential security material.",
    inputSchema: {
      type: "object",
      required: ["name", "token_service_url", "client_id", "client_secret"],
      properties: {
        name: { type: "string", description: "Alias name" },
        token_service_url: { type: "string", description: "OAuth2 token endpoint URL" },
        client_id: { type: "string" },
        client_secret: { type: "string" },
        description: { type: "string" },
        scope: { type: "string", description: "Space-separated OAuth2 scopes" },
        grant_type: {
          type: "string",
          enum: ["CLIENT_CREDENTIALS", "PASSWORD"],
          default: "CLIENT_CREDENTIALS",
        },
      },
    },
    handler: async (args) => {
      return client.post("/OAuth2ClientCredentials", {
        Name: args.name,
        TokenServiceUrl: args.token_service_url,
        ClientId: args.client_id,
        ClientSecret: args.client_secret,
        Description: args.description || "",
        Scope: args.scope || "",
        GrantType: args.grant_type || "CLIENT_CREDENTIALS",
      });
    },
  },

  {
    name: "cpi_delete_oauth2_credential",
    description: "Delete an OAuth2 Client Credential.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } },
    },
    handler: async (args) => {
      return client.delete(`/OAuth2ClientCredentials('${args.name}')`);
    },
  },

  // ─── OAuth2 Token Providers ───────────────────────────────────────────────
  {
    name: "cpi_get_oauth2_token_providers",
    description: "List OAuth2 Token Provider configurations.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      if (args.name) {
        return client.get(`/OAuth2TokenProviders('${args.name}')`);
      }
      return client.get("/OAuth2TokenProviders", client.buildQuery({ top: args.top || 50 }));
    },
  },

  // ─── Certificate-to-User Mappings ─────────────────────────────────────────
  {
    name: "cpi_get_cert_user_mappings",
    description: "List Certificate-to-User Mappings for inbound mTLS authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Get specific mapping by ID" },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      if (args.id) {
        return client.get(`/CertificateToUserMappings('${args.id}')`);
      }
      return client.get("/CertificateToUserMappings", client.buildQuery({ top: args.top || 50 }));
    },
  },

  // ─── Secure Parameters ────────────────────────────────────────────────────
  {
    name: "cpi_get_secure_parameters",
    description: "List Secure Parameter security artifacts (names only, values not returned).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      if (args.name) {
        return client.get(`/SecureParameters('${args.name}')`);
      }
      return client.get("/SecureParameters", client.buildQuery({ top: args.top || 50 }));
    },
  },

  {
    name: "cpi_create_secure_parameter",
    description: "Create a new Secure Parameter (encrypted key-value).",
    inputSchema: {
      type: "object",
      required: ["name", "secure_param"],
      properties: {
        name: { type: "string", description: "Parameter name/alias" },
        secure_param: { type: "string", description: "Secret value" },
        description: { type: "string" },
      },
    },
    handler: async (args) => {
      return client.post("/SecureParameters", {
        Name: args.name,
        SecureParam: args.secure_param,
        Description: args.description || "",
      });
    },
  },

  {
    name: "cpi_delete_secure_parameter",
    description: "Delete a Secure Parameter.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } },
    },
    handler: async (args) => {
      return client.delete(`/SecureParameters('${args.name}')`);
    },
  },

  // ─── Keystores ────────────────────────────────────────────────────────────
  {
    name: "cpi_get_keystore_entries",
    description:
      "List keystore entries (certificates, key pairs) in the CPI keystore.",
    inputSchema: {
      type: "object",
      properties: {
        alias: { type: "string", description: "Get specific entry by alias" },
        top: { type: "number", default: 50 },
        skip: { type: "number" },
      },
    },
    handler: async (args) => {
      if (args.alias) {
        return client.get(`/KeystoreEntries('${args.alias}')`);
      }
      const params = client.buildQuery({ top: args.top || 50, skip: args.skip });
      return client.get("/KeystoreEntries", params);
    },
  },

  // ─── Number Ranges ────────────────────────────────────────────────────────
  {
    name: "cpi_get_number_ranges",
    description: "List Number Range objects used for sequence number generation.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      if (args.name) {
        return client.get(`/NumberRanges('${args.name}')`);
      }
      return client.get("/NumberRanges", client.buildQuery({ top: args.top || 50 }));
    },
  },

  {
    name: "cpi_create_number_range",
    description: "Create a Number Range object.",
    inputSchema: {
      type: "object",
      required: ["name", "max_value", "min_value", "current_value", "field_length"],
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        max_value: { type: "string", description: "Max value e.g. '99999999'" },
        min_value: { type: "string", description: "Min value e.g. '1'" },
        current_value: { type: "string", description: "Starting value" },
        field_length: { type: "number", description: "Number of digits" },
        rotate: { type: "boolean", description: "Wrap around when max reached", default: false },
      },
    },
    handler: async (args) => {
      return client.post("/NumberRanges", {
        Name: args.name,
        Description: args.description || "",
        MaxValue: args.max_value,
        MinValue: args.min_value,
        CurrentValue: args.current_value,
        FieldLength: String(args.field_length),
        Rotate: args.rotate ? "true" : "false",
      });
    },
  },

  {
    name: "cpi_delete_number_range",
    description: "Delete a Number Range.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } },
    },
    handler: async (args) => {
      return client.delete(`/NumberRanges('${args.name}')`);
    },
  },

  // ─── SSH Keys ─────────────────────────────────────────────────────────────
  {
    name: "cpi_get_ssh_keys",
    description: "List SSH key pairs stored in the CPI security store.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      if (args.name) {
        return client.get(`/SSHKeys('${args.name}')`);
      }
      return client.get("/SSHKeys", client.buildQuery({ top: args.top || 50 }));
    },
  },
];

module.exports = tools;
