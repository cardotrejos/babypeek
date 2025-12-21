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
      <div className="sm:max-w-[560px] sm:mx-auto">
        <span className="font-display text-xl text-charcoal font-semibold">
          3d-ultra
        </span>
      </div>
    </header>
  )
}
