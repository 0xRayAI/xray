// Helper interface for performance metrics
export interface PerfMetrics {
  initializationTime: number;
  orchestrationLatency: number;
  agentCoordinationTime: number;
  validationExecutionTime: number;
  memoryAllocation: number;
  garbageCollectionCycles: number;
}
