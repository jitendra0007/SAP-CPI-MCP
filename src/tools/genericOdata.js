/**
 * Generic OData query tools — catch-all for any entity set
 * Useful for exploring the API and running custom queries
 */
const client = require("../utils/apiClient");

const tools = [
  {
    name: "cpi_odata_query",
    description:
      "Run a raw OData V2 GET query against any SAP CPI entity set. Use this for custom filtering, expansions, or entity sets not covered by specific tools.",
    inputSchema: {
      type: "object",
      required: ["entity_set"],
      properties: {
        entity_set: {
          type: "string",
          description:
            "OData entity set name e.g. 'MessageProcessingLogs', 'IntegrationRuntimeArtifacts', 'DataStores'",
        },
        key: {
          type: "string",
          description:
            "Optional entity key (single value or composite). E.g. \"'myFlowId'\" or \"Id='abc',Version='active'\"",
        },
        nav_property: {
          type: "string",
          description:
            "Optional navigation property to expand e.g. 'MessageProcessingLogRuns'",
        },
        filter: { type: "string", description: "OData $filter expression" },
        select: {
          type: "string",
          description: "Comma-separated property names for $select",
        },
        expand: {
          type: "string",
          description: "Navigation property name for $expand",
        },
        orderby: { type: "string", description: "$orderby expression" },
        top: { type: "number", description: "Max results (default 20)" },
        skip: { type: "number", description: "Records to skip" },
        inlinecount: {
          type: "boolean",
          description: "Return total count",
          default: false,
        },
      },
    },
    handler: async (args) => {
      let path = `/${args.entity_set}`;
      if (args.key) path += `(${args.key})`;
      if (args.nav_property) path += `/${args.nav_property}`;

      const params = client.buildQuery({
        top: args.top || 20,
        skip: args.skip,
        filter: args.filter,
        select: args.select,
        expand: args.expand,
        orderby: args.orderby,
        inlinecount: args.inlinecount,
      });

      return client.get(path, params);
    },
  },

  {
    name: "cpi_get_api_metadata",
    description:
      "Fetch the OData $metadata document — lists all entity sets, properties, and relationships available in the SAP CPI API.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (_args) => {
      const resp = await require("../utils/apiClient").axiosInstance
        ? client.get("/$metadata")
        : client.get("/$metadata");
      return resp;
    },
  },

  {
    name: "cpi_get_entity_sets",
    description:
      "List all available OData entity sets (service document) from the SAP CPI API root.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (_args) => {
      return client.get("/");
    },
  },
];

module.exports = tools;
