/**
 * Message Stores & JMS Resources API tools
 * Entity sets: JMSBrokers, JmsResources, MessageQueues,
 *   MessageQueueSubscriptions, MessageStoreEntries,
 *   SystemLogFiles, AccessLogFiles
 */
const client = require("../utils/apiClient");

const tools = [
  // ─── JMS Resources ────────────────────────────────────────────────────────
  {
    name: "cpi_get_jms_resources",
    description:
      "Get JMS resource usage statistics — queue capacity, messages, consumers, producers.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (_args) => {
      return client.get("/JmsResources");
    },
  },

  {
    name: "cpi_get_jms_brokers",
    description: "List JMS broker instances configured for the tenant.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (_args) => {
      return client.get("/JMSBrokers");
    },
  },

  // ─── Message Queues ───────────────────────────────────────────────────────
  {
    name: "cpi_get_message_queues",
    description: "List JMS message queues and their current depth / status.",
    inputSchema: {
      type: "object",
      properties: {
        queue_name: {
          type: "string",
          description: "Get a specific queue by name",
        },
        top: { type: "number", default: 50 },
      },
    },
    handler: async (args) => {
      if (args.queue_name) {
        return client.get(`/MessageQueues('${args.queue_name}')`);
      }
      return client.get(
        "/MessageQueues",
        client.buildQuery({ top: args.top || 50 })
      );
    },
  },

  {
    name: "cpi_get_queue_subscriptions",
    description: "Get subscribers for a specific JMS message queue.",
    inputSchema: {
      type: "object",
      required: ["queue_name"],
      properties: {
        queue_name: { type: "string" },
      },
    },
    handler: async (args) => {
      return client.get(
        `/MessageQueues('${args.queue_name}')/Subscriptions`
      );
    },
  },

  // ─── System & Access Log Files ────────────────────────────────────────────
  {
    name: "cpi_get_system_log_files",
    description:
      "List system log files available on the CPI worker node (ljs_trace, security, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Specific log file name",
        },
        node_scope: {
          type: "string",
          description: "Worker node scope/ID",
        },
        top: { type: "number", default: 20 },
      },
    },
    handler: async (args) => {
      const filters = [];
      if (args.node_scope)
        filters.push(`NodeScope eq '${args.node_scope}'`);
      const params = client.buildQuery({
        top: args.top || 20,
        filter: filters.length ? filters.join(" and ") : undefined,
      });
      return client.get("/SystemLogFiles", params);
    },
  },

  {
    name: "cpi_get_system_log_file_content",
    description: "Download the content of a specific system log file.",
    inputSchema: {
      type: "object",
      required: ["name", "node_scope"],
      properties: {
        name: { type: "string", description: "Log file name" },
        node_scope: { type: "string", description: "Worker node scope" },
      },
    },
    handler: async (args) => {
      return client.get(
        `/SystemLogFiles(Name='${args.name}',NodeScope='${args.node_scope}')/$value`
      );
    },
  },

  {
    name: "cpi_get_access_log_files",
    description: "List HTTP access log files for the CPI runtime.",
    inputSchema: {
      type: "object",
      properties: {
        top: { type: "number", default: 20 },
      },
    },
    handler: async (args) => {
      return client.get(
        "/AccessLogFiles",
        client.buildQuery({ top: args.top || 20 })
      );
    },
  },
];

module.exports = tools;
