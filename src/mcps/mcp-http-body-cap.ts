/**
 * SDK 1.32.2 reads maxRequestBodySize. SDK 1.28 leaves it off this
 * interface, so the same constructor call fails the excess-property check.
 * The call sites still pass MCP_MAX_REQUEST_BODY_SIZE. This merge adds the
 * field when the installed types omit it, and matches the 1.32.2 declaration
 * when they already have it.
 */
declare module "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js" {
  interface WebStandardStreamableHTTPServerTransportOptions {
    /** Upper bound, in bytes, on a POST body the transport reads itself. */
    maxRequestBodySize?: number;
  }
}

export {};
