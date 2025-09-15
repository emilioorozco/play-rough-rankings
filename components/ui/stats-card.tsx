'use client'

import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './card'

interface StatsCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
  }
  icon: LucideIcon
  description?: string
  trend?: number[]
  className?: string
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  description, 
  trend,
  className = ''
}: StatsCardProps) {
  return (
    <Card className={`border-border bg-card hover:shadow-md hover:shadow-primary/10 transition-all duration-200 hover:-translate-y-1 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-card-foreground">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {change && (
              <p className={`text-xs font-medium ${
                change.type === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}>
                {change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}% from last month
              </p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {trend && (
            <div className="flex items-end gap-0.5 h-8">
              {trend.map((height, index) => (
                <div
                  key={index}
                  className="w-1 bg-primary/30 rounded-sm"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
