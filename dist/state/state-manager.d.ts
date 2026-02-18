export interface StateManager {
    get: <T>(key: string) => T | undefined;
    set: <T>(key: string, value: T) => void;
    clear: (key: string) => void;
}
export declare class StringRayStateManager implements StateManager {
    private store;
    private persistencePath;
    private persistenceEnabled;
    private writeQueue;
    private initialized;
    private earlyOperationsQueue;
    static readonly VERSION = "1.5.0";
    constructor(persistencePath?: string, persistenceEnabled?: boolean);
    private initializePersistence;
    private persistToDisk;
    private isSerializable;
    private schedulePersistence;
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    clear(key: string): void;
    clearAll(): void;
    isPersistenceEnabled(): boolean;
    getPersistenceStats(): {
        enabled: boolean;
        initialized: boolean;
        keysInMemory: number;
        pendingWrites: number;
    };
    getStateVersion(): string;
    getAuditLog(): Array<{
        timestamp: Date;
        operation: string;
        key: string;
    }>;
    resolveConflict(conflict: {
        key: string;
        value1: unknown;
        value2: unknown;
    }): unknown;
}
export { StringRayStateManager as StrRayStateManager };
//# sourceMappingURL=state-manager.d.ts.map