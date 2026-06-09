export function logAndReturn<T = never>(logger: any, component: string, message: string, error: unknown, returnValue: T): T {
  logger.log(component, message, "error", { error: error instanceof Error ? error.message : String(error) }).catch(() => {});
  return returnValue;
}

export function logWarning(logger: any, component: string, message: string, details?: Record<string, unknown>): void {
  logger.log(component, message, "warning", details).catch(() => {});
}

export function logInfo(logger: any, component: string, message: string, details?: Record<string, unknown>): void {
  logger.log(component, message, "info", details).catch(() => {});
}
