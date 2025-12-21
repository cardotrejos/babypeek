/**
 * Effect test utilities for mocking services and running effects in tests
 */
import { Effect, Layer, Context } from "effect"

/**
 * Run an Effect in a test context with optional service layers
 * @example
 * ```ts
 * const result = await runTest(
 *   myService.doSomething(),
 *   mockService(MyService, { doSomething: () => Effect.succeed("mocked") })
 * )
 * ```
 */
export const runTest = <A, E>(
  effect: Effect.Effect<A, E, never>,
  layer?: Layer.Layer<never, never, any>
): Promise<A> => {
  const program = layer ? Effect.provide(effect, layer) : effect
  return Effect.runPromise(program)
}

/**
 * Run an Effect and expect it to fail
 * Returns the error for assertions
 */
export const runTestExpectFail = <A, E>(
  effect: Effect.Effect<A, E, never>,
  layer?: Layer.Layer<never, never, any>
): Promise<E> => {
  const program = layer ? Effect.provide(effect, layer) : effect
  return Effect.runPromise(Effect.flip(program))
}

/**
 * Create a mock service layer for testing
 * @example
 * ```ts
 * const mockR2 = mockService(R2Service, {
 *   upload: () => Effect.succeed("https://example.com/file.jpg"),
 *   delete: () => Effect.void,
 * })
 * ```
 */
export const mockService = <Id, S>(
  tag: Context.Tag<Id, S>,
  impl: S
): Layer.Layer<Id> => Layer.succeed(tag, impl)

/**
 * Create a mock service that fails with a specific error
 */
export const mockServiceFailing = <Id, S, E>(
  tag: Context.Tag<Id, S>,
  methodName: keyof S,
  error: E
): Layer.Layer<Id> => {
  const impl = {
    [methodName]: () => Effect.fail(error),
  } as unknown as S
  return Layer.succeed(tag, impl)
}
