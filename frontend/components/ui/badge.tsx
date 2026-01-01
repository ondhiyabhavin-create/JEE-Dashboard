import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm",
        secondary:
          "border-transparent bg-slate-200 text-slate-700 hover:bg-slate-300",
        destructive:
          "border-transparent bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm",
        outline: "text-slate-700 border-2 border-slate-300 bg-white",
        success: "border-transparent bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm",
        warning: "border-transparent bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

