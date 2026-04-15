export type AgentLifecycleStatus = 'active' | 'revoked';

export type AgentRuntimeStatus = 'online' | 'offline' | 'revoked';

export type AgentActivityState = 'working' | 'idle' | 'offline';

export interface OwnerAgentStatus {
  id: string;
  nodeId: string;
  displayName: string;
  status: AgentLifecycleStatus;
  runtimeStatus?: AgentRuntimeStatus;
  activityState?: AgentActivityState;
  lastSeenAt: string | null;
  lastHeartbeatAt?: string | null;
  createdAt: string;
}
