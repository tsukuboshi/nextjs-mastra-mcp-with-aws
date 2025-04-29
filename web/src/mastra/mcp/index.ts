import { MCPConfiguration } from "@mastra/mcp";
import { mcpArgs, mcpCommand, mcpEnv, mcpName } from "../../../parameter";

export const mcp = new MCPConfiguration({
  id: "mcp",
  servers: {
    [mcpName]: {
      command: mcpCommand,
      args: mcpArgs,
      env: mcpEnv,
    },
  },
});
