import { cn } from "@/lib/utils"

interface FALogoProps {
  size?: "sm" | "md" | "lg"
  variant?: "white" | "blue"
  className?: string
}

export function FALogo({ size = "md", variant = "blue", className }: FALogoProps) {
  const sizeClasses = {
    sm: "size-10 text-lg",
    md: "size-14 text-2xl",
    lg: "size-20 text-4xl",
  }

  const variantClasses = {
    white: "border-2 border-white/40 bg-white/10 text-white",
    blue: "bg-[#2563EB] text-white",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-bold tracking-tight select-none",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      aria-hidden="true"
    >
      FA
    </div>
  )
}
