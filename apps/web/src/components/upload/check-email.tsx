import { Button } from "@/components/ui/button";

interface CheckEmailProps {
  email: string;
  onTryDifferentEmail?: () => void;
  onResend?: () => void;
  isResending?: boolean;
}

export function CheckEmail({ email, onTryDifferentEmail, onResend, isResending }: CheckEmailProps) {
  return (
    <div className="rounded-xl border border-warm-gray/20 bg-white p-6 text-center shadow-sm">
      <h3 className="font-display text-xl text-charcoal">Check your email</h3>
      <p className="mt-3 text-sm text-warm-gray">
        We sent a secure magic link to <span className="font-semibold text-charcoal">{email}</span>.
      </p>
      <p className="mt-2 text-sm text-warm-gray">
        Open the link to continue your baby portrait processing.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        {onResend ? (
          <Button type="button" variant="default" onClick={onResend} disabled={isResending}>
            {isResending ? "Sending..." : "Resend Magic Link"}
          </Button>
        ) : null}
        {onTryDifferentEmail ? (
          <Button
            type="button"
            variant="outline"
            onClick={onTryDifferentEmail}
            disabled={isResending}
          >
            Use a different email
          </Button>
        ) : null}
      </div>
    </div>
  );
}
