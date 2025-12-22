/**
 * Tab Coordinator using BroadcastChannel (Story 5.7: AC8)
 *
 * Ensures only one tab polls for status updates to avoid duplicate requests.
 * Uses leader election pattern with BroadcastChannel for cross-tab communication.
 */

import type { ProcessingStage } from "@/hooks/use-status"

const CHANNEL_NAME = "babypeek-poll"
const LEADER_HEARTBEAT_INTERVAL = 2000 // 2 seconds
const LEADER_TIMEOUT = 5000 // 5 seconds without heartbeat = leader lost
const LEADER_CLAIM_WAIT_MS = 500

export interface StatusUpdate {
  jobId: string
  status: string
  stage?: ProcessingStage
  progress?: number
  resultId?: string | null
  resultUrl?: string | null
  errorMessage?: string | null
}

interface TabCoordinatorMessage {
  type:
    | "LEADER_HEARTBEAT"
    | "LEADER_CLAIM"
    | "STATUS_UPDATE"
    | "LEADER_RESIGN"
    | "REFETCH_REQUEST"
  tabId: string
  jobId?: string
  status?: StatusUpdate
  timestamp: number
}

interface TabCoordinator {
  isLeader: boolean
  broadcast: (status: StatusUpdate) => void
  requestRefetch: () => void
  close: () => void
  onStatusUpdate: (callback: (status: StatusUpdate) => void) => () => void
  onRefetchRequest: (callback: () => void) => () => void
}

function generateTabId(): string {
  // Prefer crypto.randomUUID when available
  try {
    const cryptoObj = globalThis.crypto as unknown as { randomUUID?: () => string } | undefined
    if (cryptoObj?.randomUUID) {
      return `tab-${cryptoObj.randomUUID()}`
    }
  } catch {
    // ignore
  }
  return `tab-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

/**
 * Create a tab coordinator for a specific job
 *
 * @param jobId - The job ID to coordinate polling for
 * @param onBecomeLeader - Optional callback when this tab becomes the leader
 * @param onLoseLeadership - Optional callback when this tab loses leadership
 * @returns Tab coordinator interface
 */
export function createTabCoordinator(
  jobId: string,
  onBecomeLeader?: () => void,
  onLoseLeadership?: () => void
): TabCoordinator {
  // Fallback for browsers without BroadcastChannel (Safari < 15.4)
  if (typeof BroadcastChannel === "undefined") {
    return {
      isLeader: true,
      broadcast: () => {},
      requestRefetch: () => {},
      close: () => {},
      onStatusUpdate: () => () => {},
      onRefetchRequest: () => () => {},
    }
  }

  const tabId = generateTabId()
  let channel: BroadcastChannel | null = new BroadcastChannel(CHANNEL_NAME)
  let isLeader = false
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  let leaderCheckInterval: ReturnType<typeof setInterval> | null = null
  let leaderClaimTimeout: ReturnType<typeof setTimeout> | null = null
  let lastLeaderHeartbeat = 0
  let currentLeaderId: string | null = null
  const statusUpdateCallbacks: Set<(status: StatusUpdate) => void> = new Set()
  const refetchRequestCallbacks: Set<() => void> = new Set()

  const sendMessage = (msg: Omit<TabCoordinatorMessage, "tabId" | "timestamp">) => {
    if (!channel) return
    channel.postMessage({
      ...msg,
      tabId,
      timestamp: Date.now(),
    })
  }

  const becomeLeader = () => {
    if (isLeader) return
    isLeader = true
    currentLeaderId = tabId

    // Start heartbeat
    heartbeatInterval = setInterval(() => {
      sendMessage({ type: "LEADER_HEARTBEAT", jobId })
    }, LEADER_HEARTBEAT_INTERVAL)

    // Send initial heartbeat
    sendMessage({ type: "LEADER_HEARTBEAT", jobId })

    onBecomeLeader?.()
  }

  const loseLeadership = () => {
    if (!isLeader) return
    isLeader = false

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }

    onLoseLeadership?.()
  }

  const checkLeaderStatus = () => {
    const now = Date.now()

    // If no heartbeat received for too long, attempt to become leader
    if (currentLeaderId !== tabId && now - lastLeaderHeartbeat > LEADER_TIMEOUT) {
      sendMessage({ type: "LEADER_CLAIM", jobId })
      becomeLeader()
    }
  }

  // Handle incoming messages
  channel.onmessage = (event: MessageEvent<TabCoordinatorMessage>) => {
    const msg = event.data

    // Ignore messages for different jobs
    if (msg.jobId && msg.jobId !== jobId) return

    switch (msg.type) {
      case "LEADER_HEARTBEAT":
        lastLeaderHeartbeat = msg.timestamp
        currentLeaderId = msg.tabId

        // If another tab is leader, we're not
        if (msg.tabId !== tabId && isLeader) {
          // Conflict resolution: lower tabId wins
          if (msg.tabId < tabId) {
            loseLeadership()
          }
        }
        break

      case "LEADER_CLAIM":
        // If we're the leader and someone else claims, use tabId to resolve
        if (isLeader && msg.tabId !== tabId) {
          if (msg.tabId < tabId) {
            loseLeadership()
          } else {
            // We win, reassert leadership
            sendMessage({ type: "LEADER_HEARTBEAT", jobId })
          }
        }
        break

      case "STATUS_UPDATE":
        // Ignore our own broadcasts
        if (msg.tabId === tabId) break
        // Notify all callbacks of status update from leader
        if (msg.status) {
          for (const callback of statusUpdateCallbacks) {
            callback(msg.status)
          }
        }
        break

      case "LEADER_RESIGN":
        if (msg.tabId === currentLeaderId) {
          currentLeaderId = null
          lastLeaderHeartbeat = 0
          // Try to become leader
          sendMessage({ type: "LEADER_CLAIM", jobId })
          becomeLeader()
        }
        break

      case "REFETCH_REQUEST":
        // Only the leader should act on refetch requests
        if (!isLeader) break
        for (const callback of refetchRequestCallbacks) {
          callback()
        }
        break
    }
  }

  // Start checking for leader and try to become leader
  leaderCheckInterval = setInterval(checkLeaderStatus, LEADER_HEARTBEAT_INTERVAL)

  // Initial leader claim
  sendMessage({ type: "LEADER_CLAIM", jobId })

  // Wait a bit for other leaders to respond, then become leader if none
  leaderClaimTimeout = setTimeout(() => {
    // If closed before timeout, don't do anything
    if (!channel) return
    if (!currentLeaderId) {
      becomeLeader()
    }
  }, LEADER_CLAIM_WAIT_MS)

  return {
    get isLeader() {
      return isLeader
    },

    broadcast(status: StatusUpdate) {
      if (isLeader) {
        sendMessage({ type: "STATUS_UPDATE", jobId, status })
      }
    },

    requestRefetch() {
      // If we're the leader, execute locally
      if (isLeader) {
        for (const callback of refetchRequestCallbacks) {
          callback()
        }
        return
      }
      sendMessage({ type: "REFETCH_REQUEST", jobId })
    },

    close() {
      // Resign leadership before closing
      if (isLeader) {
        sendMessage({ type: "LEADER_RESIGN", jobId })
      }

      if (leaderClaimTimeout) {
        clearTimeout(leaderClaimTimeout)
        leaderClaimTimeout = null
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      if (leaderCheckInterval) {
        clearInterval(leaderCheckInterval)
      }
      if (channel) {
        channel.close()
        channel = null
      }
      statusUpdateCallbacks.clear()
      refetchRequestCallbacks.clear()
    },

    onStatusUpdate(callback: (status: StatusUpdate) => void) {
      statusUpdateCallbacks.add(callback)
      return () => {
        statusUpdateCallbacks.delete(callback)
      }
    },

    onRefetchRequest(callback: () => void) {
      refetchRequestCallbacks.add(callback)
      return () => {
        refetchRequestCallbacks.delete(callback)
      }
    },
  }
}

/**
 * Check if BroadcastChannel is supported
 */
export function isBroadcastChannelSupported(): boolean {
  return typeof BroadcastChannel !== "undefined"
}
