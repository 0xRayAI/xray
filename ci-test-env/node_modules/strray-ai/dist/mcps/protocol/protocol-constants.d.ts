/**
 * Protocol Constants
 *
 * MCP protocol constants and configuration values.
 * Extracted to enable reuse and single source of truth.
 */
/**
 * MCP Protocol Version
 * Current MCP protocol specification version
 */
export declare const MCP_PROTOCOL_VERSION = "2024-11-05";
/**
 * JSON-RPC Protocol Version
 * Standard JSON-RPC version used by MCP
 */
export declare const JSONRPC_VERSION = "2.0";
/**
 * MCP Method Names
 * Standard MCP protocol method identifiers
 */
export declare const MCP_METHODS: {
    readonly INITIALIZE: "initialize";
    readonly TOOLS_LIST: "tools/list";
    readonly TOOLS_CALL: "tools/call";
};
/**
 * Default Timeout Values
 * Millisecond timeouts for various MCP operations
 */
export declare const DEFAULT_TIMEOUTS: {
    readonly CONNECTION: 30000;
    readonly REQUEST: 60000;
    readonly INITIALIZATION: 10000;
};
/**
 * Error Codes
 * Standard JSON-RPC error codes used by MCP
 */
export declare const ERROR_CODES: {
    readonly PARSE_ERROR: -32700;
    readonly INVALID_REQUEST: -32600;
    readonly METHOD_NOT_FOUND: -32601;
    readonly INVALID_PARAMS: -32602;
    readonly INTERNAL_ERROR: -32603;
    readonly SERVER_ERROR: -32000;
};
//# sourceMappingURL=protocol-constants.d.ts.map