/**
 * Partner Directory API tools
 * Entity sets: Partners, PartnerAuthorizations, StringParameters,
 *   BinaryParameters, AlternativePartners, AuthorizedUsers
 */
const client = require("../utils/apiClient");

const tools = [
  // ─── Partners ──────────────────────────────────────────────────────────────
  {
    name: "cpi_get_partners",
    description: "List all partners in the SAP CPI Partner Directory.",
    inputSchema: {
      type: "object",
      properties: {
        partner_id: {
          type: "string",
          description: "Get a specific partner by Pid",
        },
        top: { type: "number", default: 50 },
        skip: { type: "number" },
        filter: { type: "string", description: "OData $filter expression" },
      },
    },
    handler: async (args) => {
      if (args.partner_id) {
        return client.get(`/Partners('${args.partner_id}')`);
      }
      const params = client.buildQuery({
        top: args.top || 50,
        skip: args.skip,
        filter: args.filter,
      });
      return client.get("/Partners", params);
    },
  },

  {
    name: "cpi_create_partner",
    description: "Create a new partner entry in the Partner Directory.",
    inputSchema: {
      type: "object",
      required: ["partner_id"],
      properties: {
        partner_id: { type: "string", description: "Unique Partner ID (Pid)" },
        last_modified_by: { type: "string" },
      },
    },
    handler: async (args) => {
      return client.post("/Partners", {
        Pid: args.partner_id,
        LastModifiedBy: args.last_modified_by || "API",
      });
    },
  },

  {
    name: "cpi_delete_partner",
    description: "Delete a partner from the Partner Directory.",
    inputSchema: {
      type: "object",
      required: ["partner_id"],
      properties: { partner_id: { type: "string" } },
    },
    handler: async (args) => {
      return client.delete(`/Partners('${args.partner_id}')`);
    },
  },

  // ─── String Parameters ────────────────────────────────────────────────────
  {
    name: "cpi_get_pd_string_params",
    description: "Get string parameters for partners in the Partner Directory.",
    inputSchema: {
      type: "object",
      properties: {
        partner_id: { type: "string", description: "Filter by partner Pid" },
        param_id: { type: "string", description: "Parameter name/ID" },
        top: { type: "number", default: 100 },
        skip: { type: "number" },
      },
    },
    handler: async (args) => {
      if (args.partner_id && args.param_id) {
        return client.get(
          `/StringParameters(Pid='${args.partner_id}',Id='${args.param_id}')`
        );
      }
      const filters = [];
      if (args.partner_id) filters.push(`Pid eq '${args.partner_id}'`);
      if (args.param_id) filters.push(`Id eq '${args.param_id}'`);
      const params = client.buildQuery({
        top: args.top || 100,
        skip: args.skip,
        filter: filters.length ? filters.join(" and ") : undefined,
      });
      return client.get("/StringParameters", params);
    },
  },

  {
    name: "cpi_create_pd_string_param",
    description: "Create a string parameter for a partner in the Partner Directory.",
    inputSchema: {
      type: "object",
      required: ["partner_id", "param_id", "value"],
      properties: {
        partner_id: { type: "string" },
        param_id: { type: "string", description: "Parameter name" },
        value: { type: "string", description: "Parameter value" },
      },
    },
    handler: async (args) => {
      return client.post("/StringParameters", {
        Pid: args.partner_id,
        Id: args.param_id,
        Value: args.value,
      });
    },
  },

  {
    name: "cpi_delete_pd_string_param",
    description: "Delete a string parameter from the Partner Directory.",
    inputSchema: {
      type: "object",
      required: ["partner_id", "param_id"],
      properties: {
        partner_id: { type: "string" },
        param_id: { type: "string" },
      },
    },
    handler: async (args) => {
      return client.delete(
        `/StringParameters(Pid='${args.partner_id}',Id='${args.param_id}')`
      );
    },
  },

  // ─── Binary Parameters ────────────────────────────────────────────────────
  {
    name: "cpi_get_pd_binary_params",
    description: "Get binary parameters (e.g. certificates, files) stored for partners.",
    inputSchema: {
      type: "object",
      properties: {
        partner_id: { type: "string" },
        param_id: { type: "string" },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      if (args.partner_id && args.param_id) {
        return client.get(
          `/BinaryParameters(Pid='${args.partner_id}',Id='${args.param_id}')`
        );
      }
      const filters = [];
      if (args.partner_id) filters.push(`Pid eq '${args.partner_id}'`);
      if (args.param_id) filters.push(`Id eq '${args.param_id}'`);
      const params = client.buildQuery({
        top: args.top || 50,
        filter: filters.length ? filters.join(" and ") : undefined,
      });
      return client.get("/BinaryParameters", params);
    },
  },

  {
    name: "cpi_delete_pd_binary_param",
    description: "Delete a binary parameter from the Partner Directory.",
    inputSchema: {
      type: "object",
      required: ["partner_id", "param_id"],
      properties: {
        partner_id: { type: "string" },
        param_id: { type: "string" },
      },
    },
    handler: async (args) => {
      return client.delete(
        `/BinaryParameters(Pid='${args.partner_id}',Id='${args.param_id}')`
      );
    },
  },

  // ─── Alternative Partners ─────────────────────────────────────────────────
  {
    name: "cpi_get_alternative_partners",
    description: "Get alternative partner IDs (aliases) mapped to a canonical Partner ID.",
    inputSchema: {
      type: "object",
      properties: {
        partner_id: { type: "string", description: "Canonical Pid" },
        agency: { type: "string", description: "Filter by agency" },
        scheme: { type: "string", description: "Filter by scheme" },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      const filters = [];
      if (args.partner_id) filters.push(`Pid eq '${args.partner_id}'`);
      if (args.agency) filters.push(`Agency eq '${args.agency}'`);
      if (args.scheme) filters.push(`Scheme eq '${args.scheme}'`);
      const params = client.buildQuery({
        top: args.top || 50,
        filter: filters.length ? filters.join(" and ") : undefined,
      });
      return client.get("/AlternativePartners", params);
    },
  },

  {
    name: "cpi_create_alternative_partner",
    description: "Create an alternative partner ID mapping.",
    inputSchema: {
      type: "object",
      required: ["partner_id", "agency", "scheme", "id"],
      properties: {
        partner_id: { type: "string", description: "Canonical Pid" },
        agency: { type: "string" },
        scheme: { type: "string" },
        id: { type: "string", description: "Alternative ID value" },
      },
    },
    handler: async (args) => {
      return client.post("/AlternativePartners", {
        Pid: args.partner_id,
        Agency: args.agency,
        Scheme: args.scheme,
        Id: args.id,
      });
    },
  },

  {
    name: "cpi_delete_alternative_partner",
    description: "Delete an alternative partner mapping.",
    inputSchema: {
      type: "object",
      required: ["partner_id", "agency", "scheme", "id"],
      properties: {
        partner_id: { type: "string" },
        agency: { type: "string" },
        scheme: { type: "string" },
        id: { type: "string" },
      },
    },
    handler: async (args) => {
      return client.delete(
        `/AlternativePartners(Pid='${args.partner_id}',Agency='${args.agency}',Scheme='${args.scheme}',Id='${args.id}')`
      );
    },
  },

  // ─── Authorized Users ─────────────────────────────────────────────────────
  {
    name: "cpi_get_pd_authorized_users",
    description: "Get authorized users for a partner in the Partner Directory.",
    inputSchema: {
      type: "object",
      properties: {
        partner_id: { type: "string" },
        user_id: { type: "string" },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      if (args.partner_id && args.user_id) {
        return client.get(
          `/AuthorizedUsers(Pid='${args.partner_id}',UserId='${args.user_id}')`
        );
      }
      const filters = [];
      if (args.partner_id) filters.push(`Pid eq '${args.partner_id}'`);
      const params = client.buildQuery({
        top: args.top || 50,
        filter: filters.length ? filters.join(" and ") : undefined,
      });
      return client.get("/AuthorizedUsers", params);
    },
  },

  {
    name: "cpi_create_pd_authorized_user",
    description: "Authorize a user for a specific partner in the Partner Directory.",
    inputSchema: {
      type: "object",
      required: ["partner_id", "user_id"],
      properties: {
        partner_id: { type: "string" },
        user_id: { type: "string" },
      },
    },
    handler: async (args) => {
      return client.post("/AuthorizedUsers", {
        Pid: args.partner_id,
        UserId: args.user_id,
      });
    },
  },

  {
    name: "cpi_delete_pd_authorized_user",
    description: "Remove a user authorization from a partner.",
    inputSchema: {
      type: "object",
      required: ["partner_id", "user_id"],
      properties: {
        partner_id: { type: "string" },
        user_id: { type: "string" },
      },
    },
    handler: async (args) => {
      return client.delete(
        `/AuthorizedUsers(Pid='${args.partner_id}',UserId='${args.user_id}')`
      );
    },
  },
];

module.exports = tools;
