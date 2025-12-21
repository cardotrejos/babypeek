# Story 5.7: Mobile Session Recovery

## Story

**As a** mobile user,  
**I want** my session to recover if I background the app,  
**So that** I don't lose my progress during the 90-second wait.

## Status

**Status:** Draft  
**Priority:** 🟢 P2  
**Epic:** Epic 5 - Reveal Experience  
**Parallel:** [5.4 ∥ 5.5 ∥ 5.6 ∥ 5.7]

## Acceptance Criteria

- [ ] **AC1:** Given I'm on the processing page and I background the app, when I return to the app, then the app detects visibility change and re-fetches status
- [ ] **AC2:** If processing completed while backgrounded, I'm shown the reveal immediately
- [ ] **AC3:** If still processing, I see updated progress (stage indicator, percentage)
- [ ] **AC4:** Current jobId is persisted in localStorage on job creation
- [ ] **AC5:** On app load/navigation, saved jobId is checked and if incomplete, resume polling
- [ ] **AC6:** If job completed but user navigated away, redirect to result page on return
- [ ] **AC7:** localStorage entry is cleared after successful payment or after 24h TTL
- [ ] **AC8:** Works across browser tabs (only one tab polls at a time to avoid duplicate requests)

## Tasks

- [ ] **Task 1:** Create `useVisibilityChange` hook that listens to `document.visibilityState`
- [ ] **Task 2:** Implement session persistence in `apps/web/src/lib/session.ts`
  - [ ] Save jobId to localStorage on job creation
  - [ ] Include timestamp for TTL enforcement
  - [ ] Add resultId when processing completes
- [ ] **Task 3:** Update `processing.$jobId.tsx` to detect visibility change
  - [ ] On `visibilitychange` to 'visible', trigger immediate status refetch
  - [ ] If status is 'completed', navigate to result page
  - [ ] If status is 'failed', show error state
- [ ] **Task 4:** Implement job resume logic on app initialization
  - [ ] Check localStorage for pending job on route mount
  - [ ] If incomplete job exists, offer to resume or start fresh
  - [ ] Clear stale entries (>24h old)
- [ ] **Task 5:** Add tab coordination to prevent duplicate polling
  - [ ] Use `BroadcastChannel` API for cross-tab communication
  - [ ] Leader election: only one tab polls, others listen
  - [ ] Fallback for browsers without BroadcastChannel support
- [ ] **Task 6:** Update result page to handle direct navigation from session recovery
- [ ] **Task 7:** Write unit tests for session persistence logic
- [ ] **Task 8:** Write E2E test simulating backgrounding and returning

## Dev Notes

### Architecture Context

From `architecture.md`:
- Use client-side localStorage for session state
- Follow Effect service patterns for any backend session validation
- Keep polling logic in TanStack Query with `refetchInterval`

### Implementation Approach

**Visibility Change Hook:**

```typescript
// apps/web/src/hooks/use-visibility-change.ts
import { useEffect, useCallback } from 'react';

export function useVisibilityChange(onVisible: () => void) {
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      onVisible();
    }
  }, [onVisible]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);
}
```

**Session Storage:**

```typescript
// apps/web/src/lib/session.ts
interface SessionData {
  jobId: string;
  resultId?: string;
  createdAt: number;
}

const SESSION_KEY = '3d-ultra-session';
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function saveSession(jobId: string): void {
  const data: SessionData = {
    jobId,
    createdAt: Date.now(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function getSession(): SessionData | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  
  const data = JSON.parse(raw) as SessionData;
  if (Date.now() - data.createdAt > SESSION_TTL) {
    clearSession();
    return null;
  }
  return data;
}

export function updateSessionResult(resultId: string): void {
  const session = getSession();
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, resultId }));
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
```

**Tab Coordination (BroadcastChannel):**

```typescript
// apps/web/src/lib/tab-coordinator.ts
const CHANNEL_NAME = '3d-ultra-poll';

export function createTabCoordinator(jobId: string) {
  if (typeof BroadcastChannel === 'undefined') {
    return { isLeader: true, broadcast: () => {}, close: () => {} };
  }
  
  const channel = new BroadcastChannel(CHANNEL_NAME);
  let isLeader = false;
  
  // Simple leader election: first to claim wins
  channel.postMessage({ type: 'LEADER_CLAIM', jobId });
  
  channel.onmessage = (event) => {
    if (event.data.type === 'STATUS_UPDATE' && event.data.jobId === jobId) {
      // Non-leader tabs receive updates from leader
    }
  };
  
  return {
    get isLeader() { return isLeader; },
    broadcast: (status: unknown) => channel.postMessage({ type: 'STATUS_UPDATE', jobId, status }),
    close: () => channel.close(),
  };
}
```

**Processing Page Integration:**

```typescript
// apps/web/src/routes/processing.$jobId.tsx
import { useVisibilityChange } from '@/hooks/use-visibility-change';
import { saveSession, updateSessionResult } from '@/lib/session';

// In component:
const { refetch } = useQuery({
  queryKey: ['job-status', jobId],
  queryFn: () => api.jobs.status.query({ jobId }),
  refetchInterval: 3000,
});

// Save session on mount
useEffect(() => {
  saveSession(jobId);
}, [jobId]);

// Handle visibility change
useVisibilityChange(() => {
  refetch().then((result) => {
    if (result.data?.status === 'completed') {
      updateSessionResult(result.data.resultId);
      navigate(`/result/${result.data.resultId}`);
    }
  });
});
```

### File List

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/hooks/use-visibility-change.ts` | Create | Hook for visibility API |
| `apps/web/src/lib/session.ts` | Create | localStorage session management |
| `apps/web/src/lib/tab-coordinator.ts` | Create | BroadcastChannel tab sync |
| `apps/web/src/routes/processing.$jobId.tsx` | Modify | Add visibility handling |
| `apps/web/src/routes/result.$resultId.tsx` | Modify | Handle session resume |
| `apps/web/src/routes/__root.tsx` | Modify | Check for pending session on load |

### Dependencies

- Story 4.5 (Processing Status Updates) - provides status endpoint
- Story 5.1 (Processing Status Page) - base page to modify
- Story 5.3 (Reveal Animation) - result page to navigate to

### Testing Strategy

- Unit test: Session storage CRUD operations
- Unit test: TTL expiration logic
- Unit test: Visibility change hook fires correctly
- Integration test: Tab coordination with BroadcastChannel mocks
- E2E test: Background app → return → see updated state
- E2E test: Complete while backgrounded → return → see reveal

### Edge Cases

1. **Multiple devices:** Session is per-device, user may start on one device and finish on another
2. **Cleared storage:** If user clears localStorage, session is lost (acceptable)
3. **Network offline:** On return, if offline, show cached state with "reconnecting" indicator
4. **Tab closed:** BroadcastChannel handles gracefully via `close()`

---

## Chat Command Log

| Timestamp | Command | Summary |
|-----------|---------|---------|
| | | |

## Agent Session Record

| Session | Date | Agent Type | Summary |
|---------|------|------------|---------|
| | | | |
