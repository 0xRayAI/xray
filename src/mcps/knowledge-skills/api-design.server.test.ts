/**
 * Integration tests for API Design MCP Server
 */

import { describe, it, expect, beforeEach } from "vitest";
import StringRayApiDesignServer from "./api-design.server";

describe("api-design.server integration", () => {
  describe("module exports", () => {
    it("should export a server class", () => {
      expect(StringRayApiDesignServer).toBeDefined();
      expect(typeof StringRayApiDesignServer).toBe("function");
    });

    it("should be able to instantiate the server", () => {
      const server = new StringRayApiDesignServer();
      expect(server).toBeDefined();
    });

    it("should have run method", () => {
      const server = new StringRayApiDesignServer();
      expect(typeof server.run).toBe("function");
    });
  });

  describe("server structure", () => {
    let server: StringRayApiDesignServer;

    beforeEach(() => {
      server = new StringRayApiDesignServer();
    });

    it("should instantiate correctly", () => {
      expect(server).toBeInstanceOf(StringRayApiDesignServer);
    });

    it("should have run async method", () => {
      expect(server.run).toBeInstanceOf(Function);
    });
  });
});
