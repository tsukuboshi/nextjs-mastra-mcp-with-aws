#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { MastraMcpOnEcsStack } from "../lib/mastra-mcp-on-ecs-stack";
import { allowIp, mcpEnv, uniqueId } from "../parameter";

const app = new cdk.App();
new MastraMcpOnEcsStack(app, `MastraMcpOnEcsStack-${uniqueId}`, {
  allowIp,
  mcpEnv,
  uniqueId,
});
