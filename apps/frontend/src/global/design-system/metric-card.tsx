import * as React from "react"
import { Card, CardContent } from "./card"
import { cn, formatCurrency, formatPercentage, getChangeColor } from "./utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface MetricCardProps {
  title: string
  value: number | string
  change?: number
  changeType?: 'currency' | 'percentage'
  icon?: React.ReactNode
  className?: string
  description?: string
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ title, value, change, changeType = 'currency', icon, className, description, ...props }, ref) => {
    const formatValue = (val: number | string) => {
      if (typeof val === 'string') return val
      return changeType === 'currency' ? formatCurrency(val) : formatPercentage(val)
    }

    const formatChange = (change: number) => {
      if (changeType === 'currency') {
        return `${change >= 0 ? '+' : ''}${formatCurrency(change)}`
      }
      return formatPercentage(change)
    }

    const getTrendIcon = (change: number) => {
      if (change > 0) return <TrendingUp className="h-4 w-4" />
      if (change < 0) return <TrendingDown className="h-4 w-4" />
      return <Minus className="h-4 w-4" />
    }

    return (
      <Card ref={ref} className={cn("hover:shadow-card-hover transition-shadow", className)} {...props}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-300">{title}</p>
              <p className="text-2xl font-bold text-slate-50">
                {formatValue(value)}
              </p>
              {description && (
                <p className="text-xs text-slate-400">{description}</p>
              )}
            </div>
            {icon && (
              <div className="h-8 w-8 text-primary-500">
                {icon}
              </div>
            )}
          </div>
          {change !== undefined && (
            <div className="mt-4 flex items-center space-x-2">
              <div className={cn("flex items-center space-x-1", getChangeColor(change))}>
                {getTrendIcon(change)}
                <span className="text-sm font-medium">
                  {formatChange(change)}
                </span>
              </div>
              <span className="text-xs text-slate-400">vs last period</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)
MetricCard.displayName = "MetricCard"

export { MetricCard }
