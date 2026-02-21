import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[70] px-3 pt-[env(safe-area-inset-top)]">
      <div
        role="status"
        aria-live="polite"
        className="mx-auto w-full max-w-3xl rounded-b-xl bg-amber-100 px-4 py-3 text-center text-sm font-medium text-amber-900 shadow-sm"
      >
        You&apos;re offline right now. We&apos;ll reconnect as soon as your connection is back.
      </div>
    </div>
  );
}
