import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scheduleIdleTask } from "./browser-idle";

describe("scheduleIdleTask", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("runs the task via setTimeout when requestIdleCallback is missing", async () => {
    vi.stubGlobal("requestIdleCallback", undefined);

    const task = vi.fn();
    scheduleIdleTask(task, { timeoutMs: 50 });

    expect(task).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(50);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("does not run the task after cancel", async () => {
    vi.stubGlobal("requestIdleCallback", undefined);

    const task = vi.fn();
    const cancel = scheduleIdleTask(task, { timeoutMs: 100 });
    cancel();

    await vi.advanceTimersByTimeAsync(200);
    expect(task).not.toHaveBeenCalled();
  });

  it("falls back to setTimeout when requestIdleCallback cannot be cancelled", async () => {
    const requestIdle = vi.fn((cb: IdleRequestCallback) => {
      setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 5 }), 10);
      return 7;
    });
    vi.stubGlobal("requestIdleCallback", requestIdle);
    vi.stubGlobal("cancelIdleCallback", undefined);

    const task = vi.fn();
    const cancel = scheduleIdleTask(task, { timeoutMs: 30 });

    expect(requestIdle).not.toHaveBeenCalled();

    cancel();
    await vi.advanceTimersByTimeAsync(40);

    expect(task).not.toHaveBeenCalled();
  });

  it("schedules after requestAnimationFrame when afterPaint is true", async () => {
    vi.stubGlobal("requestIdleCallback", undefined);

    let rafCb: FrameRequestCallback | null = null;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((cb: FrameRequestCallback) => {
        rafCb = cb;
        return 1;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const task = vi.fn();
    scheduleIdleTask(task, { afterPaint: true, timeoutMs: 0 });

    expect(task).not.toHaveBeenCalled();
    expect(rafCb).not.toBeNull();

    rafCb!();
    await vi.runAllTimersAsync();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("cancels afterPaint work when the animation frame handle is 0", async () => {
    vi.stubGlobal("requestIdleCallback", undefined);

    let rafCb: FrameRequestCallback | null = null;
    const cancelAnimation = vi.fn((handle: number) => {
      if (handle === 0) {
        rafCb = null;
      }
    });
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((cb: FrameRequestCallback) => {
        rafCb = cb;
        return 0;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", cancelAnimation);

    const task = vi.fn();
    const cancel = scheduleIdleTask(task, { afterPaint: true, timeoutMs: 0 });

    cancel();
    expect(cancelAnimation).toHaveBeenCalledWith(0);

    rafCb?.(16);
    await vi.runAllTimersAsync();

    expect(task).not.toHaveBeenCalled();
  });

  it("uses requestIdleCallback when available", async () => {
    const idleCb = vi.fn();
    vi.stubGlobal(
      "requestIdleCallback",
      vi.fn((cb: IdleRequestCallback) => {
        idleCb.mockImplementation(() => cb({ didTimeout: false, timeRemaining: () => 5 }));
        return 1;
      }),
    );
    vi.stubGlobal("cancelIdleCallback", vi.fn());

    const task = vi.fn();
    scheduleIdleTask(task, { timeoutMs: 200 });

    expect(requestIdleCallback).toHaveBeenCalled();
    idleCb();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("cancels requestIdleCallback work when the idle handle is 0", async () => {
    const pending = new Map<number, ReturnType<typeof setTimeout>>();
    vi.stubGlobal(
      "requestIdleCallback",
      vi.fn((cb: IdleRequestCallback) => {
        const handle = 0;
        const timeout = setTimeout(() => {
          cb({ didTimeout: false, timeRemaining: () => 5 });
        }, 20);
        pending.set(handle, timeout);
        return handle;
      }),
    );
    const cancelIdle = vi.fn((handle: number) => {
      const timeout = pending.get(handle);
      if (timeout !== undefined) {
        clearTimeout(timeout);
        pending.delete(handle);
      }
    });
    vi.stubGlobal("cancelIdleCallback", cancelIdle);

    const task = vi.fn();
    const cancel = scheduleIdleTask(task);

    cancel();
    await vi.advanceTimersByTimeAsync(20);

    expect(cancelIdle).toHaveBeenCalledWith(0);
    expect(task).not.toHaveBeenCalled();
  });
});
