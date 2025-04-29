import { createLogger } from "@mastra/core/logger";
import { Mastra } from "@mastra/core/mastra";
import { mcpAgent } from "./agents";

export const mastra: Mastra = new Mastra({
  agents: { mcpAgent },
  logger: createLogger({
    name: "Mastra",
    level: "info",
  }),
});
