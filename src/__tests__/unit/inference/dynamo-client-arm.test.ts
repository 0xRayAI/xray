import { afterEach, describe, expect, it } from "vitest";
import {
  InferenceGovernanceIntegration,
  shutdownGovernanceIntegration,
} from "../../../integrations/governance/index.js";
import { PUBLIC_DYNAMO_SSOT, resolveDynamoBaseUrl } from "../../../integrations/governance/types.js";

describe("resolveDynamoBaseUrl", () => {
  const previous = process.env.GOVERNANCE_ENDPOINT;

  afterEach(() => {
    if (previous === undefined) delete process.env.GOVERNANCE_ENDPOINT;
    else process.env.GOVERNANCE_ENDPOINT = previous;
  });

  it("uses a configured host, then the env, then the public Dynamo origin", () => {
    delete process.env.GOVERNANCE_ENDPOINT;
    expect(resolveDynamoBaseUrl("https://example.test/governance")).toBe("https://example.test");
    expect(resolveDynamoBaseUrl("")).toBe(PUBLIC_DYNAMO_SSOT);
    process.env.GOVERNANCE_ENDPOINT = "https://env.test/governance/";
    expect(resolveDynamoBaseUrl("")).toBe("https://env.test");
  });
});

describe("ensureDynamoClient", () => {
  afterEach(async () => {
    await shutdownGovernanceIntegration();
  });

  it("arms a client when boot left the integration without one", async () => {
    const integration = new InferenceGovernanceIntegration();
    await integration.initialize();
    expect(integration.isAvailable()).toBe(false);
    await integration.ensureDynamoClient();
    expect(integration.isAvailable()).toBe(true);
    await integration.shutdown();
  });
});
