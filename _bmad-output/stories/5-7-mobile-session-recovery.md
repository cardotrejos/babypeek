# Story 5.7: Mobile Session Recovery

## Story

**As a** mobile user,  
**I want** my session to recover if I background the app,  
**So that** I don't lose my progress during the 90-second wait.

## Status

**Status:** Done  
**Priority:** 🟢 P2  
**Epic:** Epic 5 - Reveal Experience  
**Parallel:** [5.4 ∥ 5.5 ∥ 5.6 ∥ 5.7]

## Acceptance Criteria

- [x] **AC1:** Given I'm on the processing page and I background the app, when I return to the app, then the app detects visibility change and re-fetches status
- [x] **AC2:** If processing completed while backgrounded, I'm shown the reveal immediately
- [x] **AC3:** If still processing, I see updated progress (stage indicator, percentage)
- [x] **AC4:** Current jobId is persisted in localStorage on job creation
- [x] **AC5:** On app load/navigation, saved jobId is checked and if incomplete, resume polling
- [x] **AC6:** If job completed but user navigated away, redirect to result page on return
- [x] **AC7:** localStorage entry is cleared after successful payment or after 24h TTL
- [x] **AC8:** Works across browser tabs (only one tab polls at a time to avoid duplicate requests)

## Tasks

- [x] **Task 1:** Create `useVisibilityChange` hook that listens to `document.visibilityState`
- [x] **Task 2:** Implement session persistence in `apps/web/src/lib/session.ts`
  - [x] Save jobId to localStorage on job creation
  - [x] Include timestamp for TTL enforcement
  - [x] Add resultId when processing completes
- [x] **Task 3:** Update `processing.$jobId.tsx` to detect visibility change
  - [x] On `visibilitychange` to 'visible', trigger immediate status refetch
  - [x] If status is 'completed', navigate to result page
  - [x] If status is 'failed', show error state
- [x] **Task 4:** Implement job resume logic on app initialization
  - [x] Check localStorage for pending job on route mount
  - [x] If incomplete job exists, offer to resume or start fresh
  - [x] Clear stale entries (>24h old)
- [x] **Task 5:** Add tab coordination to prevent duplicate polling
  - [x] Use `BroadcastChannel` API for cross-tab communication
  - [x] Leader election: only one tab polls, others listen
  - [x] Fallback for browsers without BroadcastChannel support
- [x] **Task 6:** Update result page to handle direct navigation from session recovery
- [x] **Task 7:** Write unit tests for session persistence logic
- [x] **Task 8:** Write E2E test simulating backgrounding and returning

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

## Dev Agent Record

### Implementation Plan

Implemented mobile session recovery with the following architecture:
1. **Visibility Change Hook** (`useVisibilityChange`) - Detects when user returns to app
2. **Enhanced Session Storage** - Added TTL, status tracking, and resultId storage to existing session.ts
3. **Session Recovery Hook** (`useSessionRecovery`) - Checks for pending jobs on app load
4. **Tab Coordination** (`tab-coordinator.ts`) - BroadcastChannel-based leader election for polling
5. **Recovery Prompt Component** - Modal UI for resuming or starting fresh

### Debug Log

- All web unit tests pass (479)
- Session recovery E2E spec passes (20 tests across Desktop Chrome + Mobile Safari)
- Code review fixes applied: refetch requests, API base URL unification, timer cleanup, added prompt component tests

### Completion Notes

✅ Story 5.7 implementation complete and code-reviewed:
- Visibility return triggers immediate status refetch (leader refetches; non-leader requests leader refetch)
- Session recovery checks cached + server status and redirects when completed
- API base URL unified via `API_BASE_URL` fallback config
- Added `SessionRecoveryPrompt` component tests
- Added E2E that mocks API and validates background → return → redirect

### File List

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/hooks/use-visibility-change.ts` | Create | Hook for document.visibilityState changes |
| `apps/web/src/hooks/use-visibility-change.test.ts` | Create | Tests for visibility hook |
| `apps/web/src/hooks/use-session-recovery.ts` | Create | Session recovery hook (visibility + server check) |
| `apps/web/src/hooks/use-session-recovery.test.ts` | Create | Tests for recovery: dismissal + visibility redirect |
| `apps/web/src/hooks/use-tab-coordinator.ts` | Create | Tab coordination hook (status + refetch requests) |
| `apps/web/src/hooks/use-status.ts` | Modify | Exposed `refetch()` for immediate status refresh |
| `apps/web/src/lib/session.ts` | Modify | Added TTL, JobData, status tracking |
| `apps/web/src/lib/session.test.ts` | Modify | Added 18 tests for session recovery |
| `apps/web/src/lib/api-config.ts` | Modify | Unified API base URL fallback handling |
| `apps/web/src/lib/tab-coordinator.ts` | Create | BroadcastChannel leader election + refetch requests |
| `apps/web/src/lib/tab-coordinator.test.ts` | Create | Tests for coordinator (timeout cleanup + refetch) |
| `apps/web/src/components/session-recovery-prompt.tsx` | Create | Recovery prompt UI component |
| `apps/web/src/components/session-recovery-prompt.test.tsx` | Create | Tests for recovery prompt UI |
| `apps/web/src/routes/processing.$jobId.tsx` | Modify | Visibility refetch via query + cross-tab refetch |
| `apps/web/src/routes/result.$resultId.tsx` | Modify | Use `API_BASE_URL` + recovery tracking |
| `apps/web/src/routes/__root.tsx` | Modify | Added SessionRecoveryPrompt component |
| `e2e/session-recovery.spec.ts` | Create | E2E tests incl. API-mocked background/return flow |

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2024-12-21 | Initial implementation of Story 5.7 | AI Dev Agent |
| 2024-12-21 | Added useVisibilityChange hook with tests | AI Dev Agent |
| 2024-12-21 | Enhanced session.ts with TTL and status tracking | AI Dev Agent |
| 2024-12-21 | Integrated visibility change into processing page | AI Dev Agent |
| 2024-12-21 | Added session recovery prompt and hook | AI Dev Agent |
| 2024-12-21 | Implemented BroadcastChannel tab coordination | AI Dev Agent |
| 2024-12-21 | Added E2E tests for session recovery | AI Dev Agent |
| 2024-12-21 | Code review fixes: refetch requests, timer cleanup, API base unification, prompt tests | AI Reviewer |

---

## Chat Command Log

| Timestamp | Command | Summary |
|-----------|---------|---------|
| | | |

## Agent Session Record

| Session | Date | Agent Type | Summary |
|---------|------|------------|---------|
| 1 | 2024-12-21 | Dev Agent | Implemented full mobile session recovery with visibility change detection, session persistence (TTL, status, resultId), session recovery prompt, tab coordination, and comprehensive test suite |
| 2 | 2024-12-21 | Senior Reviewer | Fixed review findings (timer cleanup, leader refetch requests, API base URL unification), added prompt UI tests, strengthened E2E coverage |
