import { cn } from "@/lib/utils"

interface FALogoProps {
  size?: "sm" | "md" | "lg"
  variant?: "white" | "blue"
  className?: string
}

export function FALogo({ size = "md", variant = "blue", className }: FALogoProps) {
  const sizeClasses = {
    sm: "size-10 text-base",
    md: "size-14 text-2xl",
    lg: "size-20 text-4xl",
  }

  const innerSize = {
    sm: "size-4 text-[9px]",
    md: "size-6 text-sm",
    lg: "size-10 text-xl",
  }

  if (variant === "white") {
    return (
      <div
        className={cn(
          "relative inline-flex items-center justify-center rounded-2xl select-none overflow-hidden",
          "border-2 border-white/30 bg-white/10",
          sizeClasses[size],
          className
        )}
        aria-hidden="true"
      >
        <span className="relative z-10 font-black tracking-tight text-white"
          style={{ letterSpacing: "-0.03em" }}>
          FA
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-2xl select-none overflow-hidden",
        sizeClasses[size],
        className
      )}
      aria-hidden="true"
      style={{
        background: "linear-gradient(135deg, #3b82f6 0%, #2563EB 50%, #1d4ed8 100%)",
        boxShadow: "0 4px 14px -2px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
      }}
    >
      {/* Inner shine */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)",
        }}
      />
      {/* Letter */}
      <span
        className="relative z-10 font-black text-white"
        style={{ letterSpacing: "-0.03em" }}
      >
        FA
      </span>
      {/* Bottom subtle glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/2 rounded-b-2xl"
        style={{ background: "rgba(0,0,0,0.08)" }}
      />
    </div>
  )
}