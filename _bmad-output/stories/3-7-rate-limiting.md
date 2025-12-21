# Story 3.7: Rate Limiting

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system operator**,
I want **upload rate limiting enforced**,
so that **abuse is prevented and costs are controlled**.

## Acceptance Criteria

1. **AC-1:** IP address that has uploaded 10 images in the past hour is rejected with 429 status (FR-8.4)
2. **AC-2:** Error message says "You've reached the upload limit. Please try again later."
3. **AC-3:** Rate limiting is applied at Vercel edge middleware (first layer)
4. **AC-4:** Rate limiting is also applied at Hono app level (dual layer)
5. **AC-5:** Rate limit headers are returned (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)

## Tasks / Subtasks

- [ ] **Task 1: Create Vercel Edge Middleware rate limiter** (AC: 1, 3)
  - [ ] Create `apps/web/middleware.ts` for Vercel edge middleware
  - [ ] Implement IP-based rate limiting using Vercel KV or in-memory
  - [ ] Configure: 10 requests per IP per hour for `/api/upload` route
  - [ ] Return 429 with warm error message when limit exceeded
  - [ ] Set rate limit headers on all responses

- [ ] **Task 2: Create Hono middleware rate limiter** (AC: 1, 4)
  - [ ] Create `packages/api/src/middleware/rate-limit.ts`
  - [ ] Use `hono-rate-limiter` or custom Effect-based implementation
  - [ ] Configure: 10 requests per IP per hour (same as edge)
  - [ ] Apply to upload routes only
  - [ ] Handle X-Forwarded-For for real IP detection

- [ ] **Task 3: Implement IP extraction helper** (AC: 1, 3, 4)
  - [ ] Create utility to extract real client IP
  - [ ] Handle: `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`
  - [ ] Fallback to request IP if headers missing
  - [ ] Hash IP for privacy in logs

- [ ] **Task 4: Create RateLimitService Effect service** (AC: 1, 4, 5)
  - [ ] Define RateLimitService interface with check/increment methods
  - [ ] Implement in-memory storage (Map with sliding window)
  - [ ] Consider Redis/KV for production (document as enhancement)
  - [ ] Return remaining count and reset time

- [ ] **Task 5: Add rate limit headers** (AC: 5)
  - [ ] Add `X-RateLimit-Limit: 10` header
  - [ ] Add `X-RateLimit-Remaining: {count}` header
  - [ ] Add `X-RateLimit-Reset: {timestamp}` header (Unix timestamp)
  - [ ] Add headers to both success and error responses

- [ ] **Task 6: Create rate limit error response component** (AC: 2)
  - [ ] Update error handling in useUpload hook
  - [ ] Show friendly error toast: "You've reached the upload limit. Please try again later."
  - [ ] Show countdown timer to reset time (optional enhancement)
  - [ ] Track `rate_limit_exceeded` analytics event

- [ ] **Task 7: Add bypass for testing** (AC: all)
  - [ ] Add `X-RateLimit-Bypass` header check in development only
  - [ ] Configure bypass token via environment variable
  - [ ] Document testing approach

- [ ] **Task 8: Write comprehensive tests**
  - [ ] Unit test: Rate limit increments correctly
  - [ ] Unit test: Rate limit resets after window
  - [ ] Unit test: 10th request succeeds, 11th is blocked
  - [ ] Unit test: Rate limit headers are present
  - [ ] Unit test: IP extraction handles various headers
  - [ ] Integration test: Multiple uploads trigger rate limit

## Dev Notes

### Architecture Compliance

- **Dual Rate Limiting:** Edge (Vercel) + Application (Hono) per architecture.md
- **Backend:** Hono + Effect services
- **Limit:** 10 uploads per IP per hour (FR-8.4)
- **Headers:** Standard rate limit headers for client awareness

### Dual Rate Limiting Strategy (from Architecture)

```
Request → Vercel Edge → Hono App → Upload Handler
              ↓            ↓
         Rate Limit    Rate Limit
         (Layer 1)     (Layer 2)

Why dual layer?
1. Edge: Blocks at CDN level, saves function execution costs
2. App: Catches bypass attempts, more granular control
```

### Rate Limit Algorithm: Sliding Window

```typescript
// Sliding window counter
interface RateLimitWindow {
  count: number
  windowStart: number // Unix timestamp (ms)
}

const WINDOW_SIZE_MS = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS = 10

function checkRateLimit(ipHash: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const window = rateLimitStore.get(ipHash)
  
  if (!window || now - window.windowStart >= WINDOW_SIZE_MS) {
    // New window
    rateLimitStore.set(ipHash, { count: 1, windowStart: now })
    return { allowed: true, remaining: 9, resetAt: now + WINDOW_SIZE_MS }
  }
  
  if (window.count >= MAX_REQUESTS) {
    // Rate limited
    return { 
      allowed: false, 
      remaining: 0, 
      resetAt: window.windowStart + WINDOW_SIZE_MS 
    }
  }
  
  // Increment
  window.count++
  return { 
    allowed: true, 
    remaining: MAX_REQUESTS - window.count, 
    resetAt: window.windowStart + WINDOW_SIZE_MS 
  }
}
```

### Vercel Edge Middleware

```typescript
// apps/web/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// In-memory rate limit store (resets on cold start)
// For production: use Vercel KV or Upstash Redis
const rateLimitStore = new Map<string, { count: number; windowStart: number }>()

const WINDOW_SIZE_MS = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS = 10

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

function hashIP(ip: string): string {
  // Simple hash for privacy in logs
  return btoa(ip).slice(0, 16)
}

export function middleware(request: NextRequest) {
  // Only rate limit upload endpoint
  if (!request.nextUrl.pathname.startsWith('/api/upload')) {
    return NextResponse.next()
  }
  
  const ip = getClientIP(request)
  const ipHash = hashIP(ip)
  const now = Date.now()
  
  // Check rate limit
  const window = rateLimitStore.get(ipHash)
  
  // ... rate limit logic ...
  
  // Add headers
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', MAX_REQUESTS.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', resetAt.toString())
  
  return response
}

export const config = {
  matcher: '/api/upload/:path*',
}
```

### Hono Rate Limit Middleware

```typescript
// packages/api/src/middleware/rate-limit.ts
import { Context, Next } from 'hono'
import { Effect } from 'effect'
import { RateLimitError } from '../lib/errors'

// In-memory store (consider Redis for production)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>()

const WINDOW_SIZE_MS = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS = 10

function getClientIP(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    c.req.header('cf-connecting-ip') ||
    'unknown'
  )
}

export function rateLimitMiddleware() {
  return async (c: Context, next: Next) => {
    const ip = getClientIP(c)
    const ipHash = hashIP(ip)
    
    const { allowed, remaining, resetAt } = checkRateLimit(ipHash)
    
    // Always set headers
    c.header('X-RateLimit-Limit', MAX_REQUESTS.toString())
    c.header('X-RateLimit-Remaining', remaining.toString())
    c.header('X-RateLimit-Reset', resetAt.toString())
    
    if (!allowed) {
      return c.json(
        {
          error: "You've reached the upload limit. Please try again later.",
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
        },
        429
      )
    }
    
    await next()
  }
}
```

### RateLimitService (Effect)

```typescript
// packages/api/src/services/RateLimitService.ts
import { Effect, Context, Layer } from 'effect'
import { RateLimitError } from '../lib/errors'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export class RateLimitService extends Context.Tag('RateLimitService')<
  RateLimitService,
  {
    check: (key: string) => Effect.Effect<RateLimitResult, never>
    increment: (key: string) => Effect.Effect<RateLimitResult, never>
  }
>() {}

// In-memory implementation
const store = new Map<string, { count: number; windowStart: number }>()

export const RateLimitServiceLive = Layer.succeed(RateLimitService, {
  check: (key) =>
    Effect.sync(() => {
      // Check without incrementing
      const now = Date.now()
      const window = store.get(key)
      // ... return current state
    }),
    
  increment: (key) =>
    Effect.sync(() => {
      // Check and increment
      const now = Date.now()
      // ... sliding window logic
    }),
})
```

### IP Extraction Utility

```typescript
// packages/api/src/lib/ip.ts
import { Context } from 'hono'
import crypto from 'crypto'

export function getClientIP(c: Context): string {
  // Priority order for IP detection:
  // 1. Cloudflare: CF-Connecting-IP
  // 2. Standard proxy: X-Forwarded-For (first IP)
  // 3. Nginx: X-Real-IP
  // 4. Direct connection (fallback)
  
  const cfIP = c.req.header('cf-connecting-ip')
  if (cfIP) return cfIP
  
  const forwardedFor = c.req.header('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }
  
  return c.req.header('x-real-ip') || 'unknown'
}

export function hashIP(ip: string): string {
  // Hash IP for privacy (GDPR compliance)
  return crypto
    .createHash('sha256')
    .update(ip + process.env.IP_HASH_SALT || 'default-salt')
    .digest('hex')
    .slice(0, 16)
}
```

### Rate Limit Headers

```
X-RateLimit-Limit: 10          # Max requests per window
X-RateLimit-Remaining: 7       # Remaining requests in window
X-RateLimit-Reset: 1703185200  # Unix timestamp when window resets
```

### Client-Side Error Handling

```typescript
// In useUpload.ts - handle 429 response
const startUpload = async (file: File, email: string) => {
  // ... existing code ...
  
  const response = await fetch('/api/upload', { ... })
  
  if (response.status === 429) {
    const data = await response.json()
    const retryAfterMinutes = Math.ceil(data.retryAfter / 60)
    
    setState({
      status: 'error',
      error: `Upload limit reached. Try again in ${retryAfterMinutes} minutes.`,
      progress: 0,
      uploadId: null,
    })
    
    trackEvent({
      name: 'rate_limit_exceeded',
      properties: {
        retryAfter: data.retryAfter,
      }
    })
    
    return null
  }
  
  // ... continue with upload
}
```

### Error Copy (Warm Tone)

| Scenario | Message |
|----------|---------|
| Rate limited | "You've reached the upload limit. Please try again later." |
| With time | "Upload limit reached. Try again in X minutes." |

### Environment Variables

```bash
# Optional: For production rate limiting with persistence
UPSTASH_REDIS_REST_URL=  # For Vercel KV
UPSTASH_REDIS_REST_TOKEN=

# For IP hashing (GDPR)
IP_HASH_SALT=your-random-salt-string

# Development bypass (optional)
RATE_LIMIT_BYPASS_TOKEN=dev-bypass-token
```

### File Structure

```
apps/web/
├── middleware.ts                  <- NEW (Vercel edge)

packages/api/src/
├── middleware/
│   └── rate-limit.ts              <- NEW (Hono middleware)
├── services/
│   └── RateLimitService.ts        <- NEW (Effect service)
├── lib/
│   └── ip.ts                      <- NEW (IP utilities)
├── routes/
│   └── upload.ts                  <- UPDATE (apply middleware)
```

### Integration with Upload Routes

```typescript
// packages/api/src/routes/upload.ts
import { rateLimitMiddleware } from '../middleware/rate-limit'

const app = new Hono()

// Apply rate limiting to all upload routes
app.use('*', rateLimitMiddleware())

app.post('/', async (c) => {
  // ... existing upload logic
})
```

### Testing Strategy

```typescript
// packages/api/src/middleware/rate-limit.test.ts
describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    // Clear rate limit store between tests
    rateLimitStore.clear()
  })
  
  it('allows first 10 requests', async () => {
    for (let i = 0; i < 10; i++) {
      const response = await makeUploadRequest()
      expect(response.status).toBe(200)
    }
  })
  
  it('blocks 11th request with 429', async () => {
    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      await makeUploadRequest()
    }
    
    // 11th should fail
    const response = await makeUploadRequest()
    expect(response.status).toBe(429)
    expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED')
  })
  
  it('includes rate limit headers', async () => {
    const response = await makeUploadRequest()
    expect(response.headers['x-ratelimit-limit']).toBe('10')
    expect(response.headers['x-ratelimit-remaining']).toBeDefined()
    expect(response.headers['x-ratelimit-reset']).toBeDefined()
  })
  
  it('resets after window expires', async () => {
    // Fill up limit
    for (let i = 0; i < 10; i++) {
      await makeUploadRequest()
    }
    
    // Advance time past window
    vi.advanceTimersByTime(60 * 60 * 1000 + 1)
    
    // Should be allowed again
    const response = await makeUploadRequest()
    expect(response.status).toBe(200)
  })
})
```

### Analytics Events

```typescript
// Track rate limit events
| { name: 'rate_limit_exceeded'; properties: { 
    ipHash: string; 
    retryAfter: number;
    endpoint: string;
  } }
| { name: 'rate_limit_warning'; properties: { 
    remaining: number;  // Track when user approaches limit
  } }
```

### Production Considerations

1. **Persistence:** In-memory stores reset on function cold starts. For production:
   - Use Vercel KV (Upstash Redis)
   - Use Cloudflare Durable Objects
   - Document as future enhancement if not implemented

2. **Distributed Systems:** Multiple function instances share no state. Redis recommended.

3. **IP Spoofing:** Trust CF-Connecting-IP when behind Cloudflare, validate header chain.

### Dependencies

- Story 3.5 (Presigned URL) - Upload endpoint exists ✅
- Story 3.6 (Session Token) - Can also rate limit by session

### References

- [Source: _bmad-output/epics.md#Story 3.7] - Acceptance criteria
- [Source: _bmad-output/architecture.md#Cross-Cutting Concerns] - Dual rate limiting strategy
- [Source: _bmad-output/prd.md#FR-8.4] - 10 uploads/IP/hour requirement
- [Source: _bmad-output/architecture.md#Security] - Rate limiting pattern

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
