import { initializeBedrockClient } from "@/lib/bedrock-client";
import { Agent } from "@mastra/core/agent";
import { agentInstructions, agentName, bedrockModel } from "../../../parameter";
import { mcp } from "../mcp/";

const bedrock = initializeBedrockClient();

export const mcpAgent: Agent = new Agent({
  name: agentName,
  instructions: agentInstructions,
  model: bedrock(bedrockModel),
  tools: await mcp.getTools(),
});
