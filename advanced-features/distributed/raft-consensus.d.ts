/**
 */
import { EventEmitter } from "events";
import { DistributedStateManager } from "./state-manager";
export declare enum RaftState {
    FOLLOWER = "follower",
    CANDIDATE = "candidate",
    LEADER = "leader"
}
export declare enum RaftMessageType {
    REQUEST_VOTE = "request_vote",
    REQUEST_VOTE_RESPONSE = "request_vote_response",
    APPEND_ENTRIES = "append_entries",
    APPEND_ENTRIES_RESPONSE = "append_entries_response"
}
export interface RaftMessage {
    type: RaftMessageType;
    term: number;
    from: string;
    to: string;
    data?: any;
}
export interface LogEntry {
    term: number;
    index: number;
    command: any;
    timestamp: number;
}
export interface RaftConfig {
    electionTimeoutMin: number;
    electionTimeoutMax: number;
    heartbeatInterval: number;
    maxLogEntriesPerAppend: number;
    snapshotThreshold: number;
}
export interface RaftPeer {
    id: string;
    lastContact: number;
    nextIndex: number;
    matchIndex: number;
}
/**
 */
export declare class RaftConsensus extends EventEmitter {
    private instanceId;
    private stateManager;
    private state;
    private currentTerm;
    private votedFor;
    private log;
    private commitIndex;
    private lastApplied;
    private peers;
    private leaderId;
    private electionTimer?;
    private heartbeatTimer?;
    private config;
    constructor(instanceId: string, stateManager: DistributedStateManager, config?: Partial<RaftConfig>);
    private initializeRaft;
    /**
     */
    startElection(): Promise<void>;
    private requestVotes;
    private requestVoteFromPeer;
    private becomeLeader;
    private becomeFollower;
    /**
     */
    handleMessage(message: RaftMessage): Promise<RaftMessage | null>;
    private handleRequestVote;
    private handleRequestVoteResponse;
    private handleAppendEntries;
    private handleAppendEntriesResponse;
    /**
     */
    appendEntry(command: any): Promise<boolean>;
    private replicateToFollowers;
    private sendAppendEntries;
    private startHeartbeatTimer;
    private sendHeartbeats;
    private resetElectionTimer;
    private updateCommitIndex;
    private applyCommittedEntries;
    private discoverPeers;
    private sendMessage;
    private persistState;
    private restoreState;
    /**
     */
    getState(): {
        state: RaftState;
        term: number;
        leaderId: string | null;
        isLeader: boolean;
    };
    /**
     */
    getLeader(): string | null;
    /**
     */
    isLeader(): boolean;
    /**
     */
    shutdown(): Promise<void>;
}
export declare const createRaftConsensus: (instanceId: string, stateManager: DistributedStateManager, config?: Partial<RaftConfig>) => RaftConsensus;
//# sourceMappingURL=raft-consensus.d.ts.map