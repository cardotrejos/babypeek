import { useEffect, useState } from "react";

import { scheduleIdleTask } from "@/lib/browser-idle";

import { OfflineBanner } from "./offline-banner";
import { SessionRecoveryPrompt } from "./session-recovery-prompt";

export function GlobalOverlays() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    return scheduleIdleTask(
      () => {
        setMounted(true);
      },
      { afterPaint: true, timeoutMs: 1200 },
    );
  }, []);

  if (!mounted) return null;

  return (
    <>
      <OfflineBanner />
      <SessionRecoveryPrompt />
    </>
  );
}
