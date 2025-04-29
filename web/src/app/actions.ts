"use server";

import { mastra } from "@/mastra";

export async function sampleAgent(formData: FormData) {
  const prompt = JSON.parse(formData.get("message") as string);
  const maxSteps = parseInt(formData.get("maxSteps") as string);
  const agent = mastra.getAgent("mcpAgent");

  const steps: { text: string; toolCalls?: string[] }[] = [];

  const result = await agent.generate(
    `Automatically detect the language of the user's request and think and answer in the same language：${prompt}`,
    {
      maxSteps,
      onStepFinish: ({ text, toolCalls, toolResults }) => {
        console.log("Step completed:", { text, toolCalls, toolResults });
        steps.push({
          text,
          toolCalls: Array.isArray(toolCalls)
            ? toolCalls.map((tc) => tc.toolName)
            : [],
        });
      },
    }
  );

  console.log("Answer completed:", {
    finishReason: result.finishReason,
    modelId: result.response.modelId,
    timestamp: result.response.timestamp,
    totalTokens: result.usage?.totalTokens,
  });

  return {
    steps,
  };
}
