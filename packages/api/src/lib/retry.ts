/**
 * Retry Schedules
 *
 * Reusable Effect retry schedules for external API calls.
 * Uses exponential backoff with jitter to prevent thundering herd.
 *
 * @see Story 4.3 - Retry Logic with Exponential Backoff
 * @see https://effect.website/docs/scheduling/schedules
 */

import { Schedule, Duration } from "effect"

/**
 * Gemini API retry schedule with exponential backoff.
 *
 * Delays: 1s -> 2s -> 4s (with ±10% jitter)
 * Max retries: 3 (4 total attempts)
 *
 * Example timeline:
 * - Attempt 1: immediate
 * - Attempt 2: after ~1s (0.9-1.1s)
 * - Attempt 3: after ~2s (1.8-2.2s)
 * - Attempt 4: after ~4s (3.6-4.4s)
 *
 * NOTE: This schedule provides the timing only.
 * The retry predicate (isRetryableGeminiError) should be applied
 * using Schedule.whileInput or Effect.retry({ while: ... })
 */
export const geminiRetrySchedule = Schedule.exponential(Duration.seconds(1)).pipe(
  Schedule.jittered,
  Schedule.intersect(Schedule.recurs(3)) // Max 3 retries = 4 total attempts
)

/**
 * Alternative schedule with exact delays for testing.
 * No jitter - deterministic timing for assertions.
 */
export const geminiRetryScheduleExact = Schedule.fromDelays(
  Duration.seconds(1),
  Duration.seconds(2),
  Duration.seconds(4)
)

/**
 * Quick retry schedule for less critical operations.
 * 3 retries with 500ms base delay.
 */
export const quickRetrySchedule = Schedule.exponential(Duration.millis(500)).pipe(
  Schedule.jittered,
  Schedule.intersect(Schedule.recurs(3))
)
