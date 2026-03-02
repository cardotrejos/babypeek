import { Button } from "@/components/ui/button";

interface CheckEmailProps {
  email: string;
  onTryDifferentEmail?: () => void;
}

export function CheckEmail({ email, onTryDifferentEmail }: CheckEmailProps) {
  return (
    <div className="rounded-xl border border-warm-gray/20 bg-white p-6 text-center shadow-sm">
      <h3 className="font-display text-xl text-charcoal">Check your email</h3>
      <p className="mt-3 text-sm text-warm-gray">
        We sent a secure magic link to <span className="font-semibold text-charcoal">{email}</span>.
      </p>
      <p className="mt-2 text-sm text-warm-gray">
        Open the link to continue your baby portrait processing.
      </p>
      {onTryDifferentEmail ? (
        <Button
          type="button"
          variant="outline"
          className="mt-5"
          onClick={onTryDifferentEmail}
        >
          Use a different email
        </Button>
      ) : null}
    </div>
  );
}
