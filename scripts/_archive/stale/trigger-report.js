import { StringRayOrchestrator } from "../../dist/core/orchestrator.js";

console.log(
  "🚀 Starting StrRay Framework to trigger automated report generation...",
);

// Initialize orchestrator - this will trigger the post-processor on completion
const orchestrator = new StringRayOrchestrator({
  maxConcurrentTasks: 1,
  taskTimeout: 30000,
});

console.log(
  "✅ Framework initialized - post-processor will auto-generate report when operations complete",
);
