/**
 * Integration tests for API Design MCP Server
 */

import { describe, it, expect, beforeEach } from "vitest";
import XrayApiDesignServer from "./api-design.server";

describe("api-design.server integration", () => {
  describe("module exports", () => {
    it("should export a server class", () => {
      expect(XrayApiDesignServer).toBeDefined();
      expect(typeof XrayApiDesignServer).toBe("function");
    });

    it("should be able to instantiate the server", () => {
      const server = new XrayApiDesignServer();
      expect(server).toBeDefined();
    });

    it("should have run method", () => {
      const server = new XrayApiDesignServer();
      expect(typeof server.run).toBe("function");
    });
  });

  describe("server structure", () => {
    let server: XrayApiDesignServer;

    beforeEach(() => {
      server = new XrayApiDesignServer();
    });

    it("should instantiate correctly", () => {
      expect(server).toBeInstanceOf(XrayApiDesignServer);
    });

    it("should have run async method", () => {
      expect(server.run).toBeInstanceOf(Function);
    });
  });
});
