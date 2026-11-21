/**
 * Integration Content API tools
 * Entity sets: IntegrationPackages, IntegrationDesigntimeArtifacts,
 *   IntegrationRuntimeArtifacts, ServiceEndpoints, DataStores,
 *   DataStoreEntries, Variables, BuildAndDeployStatus,
 *   IntegrationDesigntimeArtifactSavePoints
 */
const client = require("../utils/apiClient");

const tools = [
  // ─── Integration Packages ───────────────────────────────────────────────────
  {
    name: "cpi_get_packages",
    description:
      "List all integration packages (design-time) on the CPI tenant.",
    inputSchema: {
      type: "object",
      properties: {
        package_id: {
          type: "string",
          description: "Get a specific package by ID",
        },
        search: {
          type: "string",
          description: "Filter packages by name (contains search)",
        },
        top: { type: "number", default: 50 },
        skip: { type: "number" },
      },
    },
    handler: async (args) => {
      if (args.package_id) {
        return client.get(`/IntegrationPackages('${args.package_id}')`);
      }
      const filters = [];
      if (args.search)
        filters.push(`substringof('${args.search}',Name)`);
      const params = client.buildQuery({
        top: args.top || 50,
        skip: args.skip,
        filter: filters.length ? filters.join(" and ") : undefined,
      });
      return client.get("/IntegrationPackages", params);
    },
  },

  {
    name: "cpi_get_package_artifacts",
    description:
      "Get all design-time artifacts (iFlows, Value Mappings, etc.) inside an integration package.",
    inputSchema: {
      type: "object",
      required: ["package_id"],
      properties: {
        package_id: { type: "string", description: "Integration Package ID" },
        artifact_type: {
          type: "string",
          enum: [
            "IntegrationFlow",
            "ValueMapping",
            "MessageMapping",
            "FunctionLibraries",
            "ScriptCollection",
          ],
          description: "Filter by artifact type",
        },
      },
    },
    handler: async (args) => {
      let path = `/IntegrationPackages('${args.package_id}')/IntegrationDesigntimeArtifacts`;
      const params = {};
      if (args.artifact_type) {
        params["$filter"] = `Type eq '${args.artifact_type}'`;
      }
      return client.get(path, params);
    },
  },

  // ─── Design-time Artifacts ────────────────────────────────────────────────
  {
    name: "cpi_get_designtime_artifact",
    description:
      "Get metadata of a specific design-time artifact (iFlow, Value Mapping, etc.).",
    inputSchema: {
      type: "object",
      required: ["artifact_id", "version"],
      properties: {
        artifact_id: {
          type: "string",
          description: "Artifact ID (technical name)",
        },
        version: {
          type: "string",
          description: "Version e.g. 'active' or '1.0.0'",
          default: "active",
        },
      },
    },
    handler: async (args) => {
      return client.get(
        `/IntegrationDesigntimeArtifacts(Id='${args.artifact_id}',Version='${args.version}')`
      );
    },
  },

  {
    name: "cpi_deploy_artifact",
    description:
      "Deploy (or redeploy) a design-time artifact to the runtime. Triggers a build & deploy.",
    inputSchema: {
      type: "object",
      required: ["artifact_id", "version"],
      properties: {
        artifact_id: { type: "string", description: "Artifact ID" },
        version: { type: "string", default: "active" },
      },
    },
    handler: async (args) => {
      return client.post(
        `/DeployIntegrationDesigntimeArtifact?Id='${args.artifact_id}'&Version='${args.version}'`
      );
    },
  },

  {
    name: "cpi_get_deploy_status",
    description:
      "Check the build & deploy status for an artifact (after triggering a deploy).",
    inputSchema: {
      type: "object",
      required: ["task_id"],
      properties: {
        task_id: {
          type: "string",
          description:
            "TaskId returned from a deploy call or from BuildAndDeployStatus",
        },
      },
    },
    handler: async (args) => {
      return client.get(`/BuildAndDeployStatus(TaskId='${args.task_id}')`);
    },
  },

  {
    name: "cpi_get_artifact_savepoints",
    description:
      "Get the list of save points (versions/drafts) for a design-time artifact.",
    inputSchema: {
      type: "object",
      required: ["artifact_id"],
      properties: {
        artifact_id: { type: "string" },
      },
    },
    handler: async (args) => {
      return client.get(
        `/IntegrationDesigntimeArtifactSavePoints?$filter=Id eq '${args.artifact_id}'`
      );
    },
  },

  // ─── Runtime Artifacts ────────────────────────────────────────────────────
  {
    name: "cpi_get_runtime_artifacts",
    description:
      "List all deployed runtime artifacts and their current status (STARTED, STARTING, ERROR, STOPPING, STOPPED).",
    inputSchema: {
      type: "object",
      properties: {
        artifact_id: {
          type: "string",
          description: "Get a specific runtime artifact by ID",
        },
        status: {
          type: "string",
          enum: ["STARTED", "STARTING", "ERROR", "STOPPING", "STOPPED"],
          description: "Filter by runtime status",
        },
      },
    },
    handler: async (args) => {
      if (args.artifact_id) {
        return client.get(
          `/IntegrationRuntimeArtifacts('${args.artifact_id}')`
        );
      }
      const params = {};
      if (args.status) {
        params["$filter"] = `Status eq '${args.status}'`;
      }
      return client.get("/IntegrationRuntimeArtifacts", params);
    },
  },

  {
    name: "cpi_undeploy_artifact",
    description: "Undeploy (stop & remove) a runtime artifact from CPI.",
    inputSchema: {
      type: "object",
      required: ["artifact_id"],
      properties: {
        artifact_id: { type: "string", description: "Runtime Artifact ID" },
      },
    },
    handler: async (args) => {
      return client.delete(
        `/IntegrationRuntimeArtifacts('${args.artifact_id}')`
      );
    },
  },

  // ─── Service Endpoints ────────────────────────────────────────────────────
  {
    name: "cpi_get_service_endpoints",
    description:
      "Discover all service endpoints (URLs) exposed by deployed iFlows on the tenant.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Filter by endpoint/artifact name",
        },
        type: {
          type: "string",
          enum: ["DEV", "TEST", "PROD", "SANDBOX"],
          description: "Filter by environment type",
        },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      const filters = [];
      if (args.name) filters.push(`substringof('${args.name}',Name)`);
      const params = client.buildQuery({
        top: args.top || 50,
        filter: filters.length ? filters.join(" and ") : undefined,
        expand: "EntryPoints",
      });
      return client.get("/ServiceEndpoints", params);
    },
  },

  // ─── Data Stores & Variables ───────────────────────────────────────────────
  {
    name: "cpi_get_data_stores",
    description: "List all data stores on the CPI tenant.",
    inputSchema: {
      type: "object",
      properties: {
        data_store_name: {
          type: "string",
          description: "Get a specific data store by name",
        },
        integration_flow: {
          type: "string",
          description: "Filter by owning iFlow name",
        },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      const filters = [];
      if (args.data_store_name)
        filters.push(`DataStoreName eq '${args.data_store_name}'`);
      if (args.integration_flow)
        filters.push(
          `IntegrationFlow eq '${args.integration_flow}'`
        );
      const params = client.buildQuery({
        top: args.top || 50,
        filter: filters.length ? filters.join(" and ") : undefined,
      });
      return client.get("/DataStores", params);
    },
  },

  {
    name: "cpi_get_data_store_entries",
    description:
      "Get entries stored in a specific Data Store (JMS/global data store entries).",
    inputSchema: {
      type: "object",
      required: ["data_store_name"],
      properties: {
        data_store_name: { type: "string" },
        integration_flow: { type: "string" },
        type: {
          type: "string",
          enum: ["GLOBAL", "LOCAL"],
          description: "Data store type",
        },
        entry_id: { type: "string", description: "Get a specific entry by ID" },
        top: { type: "number", default: 50 },
        skip: { type: "number" },
      },
    },
    handler: async (args) => {
      const filters = [
        `DataStoreName eq '${args.data_store_name}'`,
      ];
      if (args.integration_flow)
        filters.push(`IntegrationFlow eq '${args.integration_flow}'`);
      if (args.type) filters.push(`Type eq '${args.type}'`);

      const params = client.buildQuery({
        top: args.top || 50,
        skip: args.skip,
        filter: filters.join(" and "),
      });
      return client.get("/DataStoreEntries", params);
    },
  },

  {
    name: "cpi_delete_data_store_entry",
    description: "Delete a specific entry from a data store.",
    inputSchema: {
      type: "object",
      required: ["data_store_name", "entry_id", "integration_flow"],
      properties: {
        data_store_name: { type: "string" },
        entry_id: { type: "string" },
        integration_flow: { type: "string" },
        type: { type: "string", default: "GLOBAL" },
      },
    },
    handler: async (args) => {
      return client.delete(
        `/DataStoreEntries(DataStoreName='${args.data_store_name}',Id='${args.entry_id}',IntegrationFlow='${args.integration_flow}',Type='${args.type || "GLOBAL"}')`
      );
    },
  },

  {
    name: "cpi_get_variables",
    description:
      "List all integration flow variables stored on the CPI tenant.",
    inputSchema: {
      type: "object",
      properties: {
        variable_name: {
          type: "string",
          description: "Get a specific variable by name",
        },
        integration_flow: {
          type: "string",
          description: "Filter by owning iFlow",
        },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      const filters = [];
      if (args.variable_name)
        filters.push(`VariableName eq '${args.variable_name}'`);
      if (args.integration_flow)
        filters.push(`IntegrationFlow eq '${args.integration_flow}'`);
      const params = client.buildQuery({
        top: args.top || 50,
        filter: filters.length ? filters.join(" and ") : undefined,
      });
      return client.get("/Variables", params);
    },
  },

  {
    name: "cpi_delete_variable",
    description: "Delete an integration flow variable.",
    inputSchema: {
      type: "object",
      required: ["variable_name", "integration_flow"],
      properties: {
        variable_name: { type: "string" },
        integration_flow: { type: "string" },
      },
    },
    handler: async (args) => {
      return client.delete(
        `/Variables(VariableName='${args.variable_name}',IntegrationFlow='${args.integration_flow}')`
      );
    },
  },
];

module.exports = tools;
