import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { region } from "../../parameter";

export function initializeBedrockClient() {
  if (process.env.NODE_ENV === "production") {
    return createAmazonBedrock({
      region,
      credentialProvider: fromNodeProviderChain(),
    });
  } else {
    return createAmazonBedrock({
      region,
      accessKeyId: process.env.ACCESS_KEY_ID,
      secretAccessKey: process.env.SECRET_ACCESS_KEY,
      sessionToken: process.env.SESSION_TOKEN,
    });
  }
}
