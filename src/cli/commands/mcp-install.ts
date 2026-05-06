switch (command) {
  case "list":
    listMCPs();
    break;
  case "status":
    showStatus();
    break;
  case "install":
    const name = args[1];
    if (!name) {
      console.error("\nUsage: npx strray-ai mcp:install <name>");
      console.log("Run: npx strray-ai mcp:list to see available MCPs");
      process.exit(1);
    }
    await installMCP(name);
    break;
  // ... rest of cases
}