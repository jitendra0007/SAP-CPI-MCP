/**
 * Message Processing Logs API tools
 * Entity sets: MessageProcessingLogs, MessageProcessingLogRuns,
 *   MessageProcessingLogRunSteps, MessageStoreEntries,
 *   MessageStoreEntryAttachments, IdMapToIds, IdMapFromIds,
 *   IdempotentRepositoryEntries
 */
const client = require("../utils/apiClient");

const tools = [
  {
    name: "cpi_get_message_logs",
    description:
      "Get message processing logs from SAP CPI. Supports filtering by status (COMPLETED, FAILED, PROCESSING, DISCARDED, ABANDONED), date range, and artifact name.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["COMPLETED", "FAILED", "PROCESSING", "DISCARDED", "ABANDONED"],
          description: "Filter by processing status",
        },
        log_start_from: {
          type: "string",
          description:
            "ISO datetime e.g. 2024-01-01T00:00:00. Filter logs started after this time.",
        },
        log_start_to: {
          type: "string",
          description: "ISO datetime. Filter logs started before this time.",
        },
        artifact_name: {
          type: "string",
          description: "Filter by integration flow name",
        },
        message_guid: {
          type: "string",
          description: "Get a specific log by its MessageGuid",
        },
        top: { type: "number", description: "Max results (default 20)" },
        skip: { type: "number", description: "Offset for pagination" },
        orderby: {
          type: "string",
          description: "e.g. LogStart desc",
          default: "LogStart desc",
        },
      },
    },
    handler: async (args) => {
      if (args.message_guid) {
        return client.get(`/MessageProcessingLogs('${args.message_guid}')`);
      }
      const filters = [];
      if (args.status) filters.push(`Status eq '${args.status}'`);
      if (args.log_start_from)
        filters.push(
          `LogStart gt datetime'${args.log_start_from.replace("Z", "")}'`
        );
      if (args.log_start_to)
        filters.push(
          `LogStart lt datetime'${args.log_start_to.replace("Z", "")}'`
        );
      if (args.artifact_name)
        filters.push(`IntegrationFlowName eq '${args.artifact_name}'`);

      const params = client.buildQuery({
        top: args.top || 20,
        skip: args.skip,
        filter: filters.length ? filters.join(" and ") : undefined,
        orderby: args.orderby || "LogStart desc",
        inlinecount: true,
      });
      return client.get("/MessageProcessingLogs", params);
    },
  },

  {
    name: "cpi_get_message_log_runs",
    description:
      "Get the run details (child runs) for a specific message processing log.",
    inputSchema: {
      type: "object",
      required: ["message_guid"],
      properties: {
        message_guid: { type: "string", description: "Parent MessageGuid" },
      },
    },
    handler: async (args) => {
      return client.get(
        `/MessageProcessingLogs('${args.message_guid}')/MessageProcessingLogRuns`
      );
    },
  },

  {
    name: "cpi_get_message_log_run_steps",
    description: "Get the step-by-step trace of a specific log run.",
    inputSchema: {
      type: "object",
      required: ["message_guid"],
      properties: {
        message_guid: { type: "string", description: "MessageGuid" },
        run_id: {
          type: "string",
          description: "Optional specific run ID. If omitted, returns all runs' steps.",
        },
      },
    },
    handler: async (args) => {
      if (args.run_id) {
        return client.get(
          `/MessageProcessingLogRuns('${args.run_id}')/MessageProcessingLogRunSteps`
        );
      }
      return client.get(
        `/MessageProcessingLogs('${args.message_guid}')/MessageProcessingLogRuns`
      );
    },
  },

  {
    name: "cpi_get_message_store_entries",
    description:
      "Get persisted message store entries (messages saved via Persist step or Data Store).",
    inputSchema: {
      type: "object",
      properties: {
        message_guid: {
          type: "string",
          description: "Get entries for a specific message",
        },
        top: { type: "number", default: 20 },
        skip: { type: "number" },
      },
    },
    handler: async (args) => {
      if (args.message_guid) {
        return client.get(
          `/MessageProcessingLogs('${args.message_guid}')/MessageStoreEntries`
        );
      }
      const params = client.buildQuery({ top: args.top || 20, skip: args.skip });
      return client.get("/MessageStoreEntries", params);
    },
  },

  {
    name: "cpi_get_idmap",
    description:
      "Query the ID Mapper — look up mapped IDs from a source or target perspective.",
    inputSchema: {
      type: "object",
      properties: {
        source_id: {
          type: "string",
          description: "Source ID to look up mappings FROM",
        },
        target_id: {
          type: "string",
          description: "Target ID to look up mappings TO",
        },
        namespace: { type: "string", description: "ID mapper namespace" },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      const filters = [];
      if (args.namespace)
        filters.push(`Namespace eq '${args.namespace}'`);
      if (args.source_id)
        filters.push(`SourceId eq '${args.source_id}'`);

      const params = client.buildQuery({
        top: args.top || 50,
        filter: filters.length ? filters.join(" and ") : undefined,
      });

      if (args.target_id) {
        const tFilters = [`TargetId eq '${args.target_id}'`];
        if (args.namespace)
          tFilters.push(`Namespace eq '${args.namespace}'`);
        return client.get(
          "/IdMapToIds",
          client.buildQuery({
            top: args.top || 50,
            filter: tFilters.join(" and "),
          })
        );
      }
      return client.get("/IdMapFromIds", params);
    },
  },

  {
    name: "cpi_get_idempotent_entries",
    description:
      "Query idempotent repository entries to check for duplicate message detection.",
    inputSchema: {
      type: "object",
      properties: {
        source_id: { type: "string", description: "Source system identifier" },
        source_msg_id: {
          type: "string",
          description: "Source message ID to check",
        },
        top: { type: "number", default: 20 },
      },
    },
    handler: async (args) => {
      const filters = [];
      if (args.source_id)
        filters.push(`SourceSystem eq '${args.source_id}'`);
      if (args.source_msg_id)
        filters.push(`SourceMessageId eq '${args.source_msg_id}'`);
      const params = client.buildQuery({
        top: args.top || 20,
        filter: filters.length ? filters.join(" and ") : undefined,
      });
      return client.get("/IdempotentRepositoryEntries", params);
    },
  },
];

module.exports = tools;
