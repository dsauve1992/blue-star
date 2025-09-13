import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200",
        secondary:
          "border-transparent bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50",
        success:
          "border-transparent bg-success-100 dark:bg-success-900 text-success-800 dark:text-success-200",
        danger:
          "border-transparent bg-danger-100 dark:bg-danger-900 text-danger-800 dark:text-danger-200",
        warning:
          "border-transparent bg-warning-100 dark:bg-warning-900 text-warning-800 dark:text-warning-200",
        outline: "text-slate-950 dark:text-slate-50 border-slate-200 dark:border-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
