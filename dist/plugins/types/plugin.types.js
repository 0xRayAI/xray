/**
 * Plugin Types and Interfaces
 *
 * Core type definitions for StringRay plugin architecture.
 *
 * @version 1.0.0
 */
export var PluginType;
(function (PluginType) {
    PluginType["MCP_SERVER"] = "mcp-server";
    PluginType["SKILL"] = "skill";
    PluginType["INTEGRATION"] = "integration";
    PluginType["AGENT"] = "agent";
})(PluginType || (PluginType = {}));
export var PluginState;
(function (PluginState) {
    PluginState["UNINSTALLED"] = "uninstalled";
    PluginState["INSTALLED"] = "installed";
    PluginState["ENABLED"] = "enabled";
    PluginState["ACTIVE"] = "active";
})(PluginState || (PluginState = {}));
//# sourceMappingURL=plugin.types.js.map