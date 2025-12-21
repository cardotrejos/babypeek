import { cn } from "@/lib/utils"

interface LandingHeaderProps {
  className?: string
}

export function LandingHeader({ className }: LandingHeaderProps) {
  return (
    <header
      className={cn(
        "absolute top-0 left-0 right-0 z-10",
        "p-4 sm:p-6",
        "safe-top",
        className
      )}
    >
      <div className="sm:max-w-[560px] sm:mx-auto flex items-center gap-2">
        <img src="/logo.svg" alt="BabyPeek" className="h-8 w-8" />
        <span className="font-display text-xl text-charcoal font-semibold">
          BabyPeek
        </span>
      </div>
    </header>
  )
}
