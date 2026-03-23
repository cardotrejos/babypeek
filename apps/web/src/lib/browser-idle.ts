export type ScheduleIdleTaskOptions = {
  afterPaint?: boolean;
  timeoutMs?: number;
};

export function scheduleIdleTask(
  task: () => void,
  options?: ScheduleIdleTaskOptions,
): () => void {
  const requestAnimation =
    typeof requestAnimationFrame === "function" && typeof cancelAnimationFrame === "function"
      ? requestAnimationFrame
      : null;
  const cancelAnimation =
    typeof requestAnimationFrame === "function" && typeof cancelAnimationFrame === "function"
      ? cancelAnimationFrame
      : null;
  const requestIdle =
    typeof requestIdleCallback === "function" && typeof cancelIdleCallback === "function"
      ? requestIdleCallback
      : null;
  const cancelIdle =
    typeof requestIdleCallback === "function" && typeof cancelIdleCallback === "function"
      ? cancelIdleCallback
      : null;

  let cancelled = false;
  let rafHandle: ReturnType<typeof requestAnimationFrame> | null = null;
  let idleHandle: ReturnType<typeof requestIdleCallback> | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const run = () => {
    if (cancelled) {
      return;
    }

    task();
  };

  const scheduleIdle = () => {
    if (requestIdle) {
      idleHandle = requestIdle(
        () => {
          idleHandle = null;
          run();
        },
        options?.timeoutMs != null ? { timeout: options.timeoutMs } : undefined,
      );
      return;
    }

    const delay = options?.timeoutMs ?? 0;
    timeoutHandle = setTimeout(() => {
      timeoutHandle = null;
      run();
    }, delay);
  };

  if (options?.afterPaint && requestAnimation) {
    rafHandle = requestAnimation(() => {
      rafHandle = null;
      scheduleIdle();
    });
  } else {
    scheduleIdle();
  }

  return () => {
    cancelled = true;

    if (rafHandle !== null && cancelAnimation) {
      cancelAnimation(rafHandle);
      rafHandle = null;
    }
    if (idleHandle !== null && cancelIdle) {
      cancelIdle(idleHandle);
      idleHandle = null;
    }
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
  };
}
