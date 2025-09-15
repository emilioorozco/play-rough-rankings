"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: number[];
  isLoading?: boolean;
}

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  description,
  trend = [],
  isLoading = false,
}: StatsCardProps) {
  // Empty state when no data is available
  if (!isLoading && (value === null || value === undefined || value === "")) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-muted-foreground">—</div>
          <p className="text-xs text-muted-foreground">
            {description || "No data available"}
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="space-y-2">
          <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
          <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="space-y-2">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="flex items-center justify-between">
          {change && (
            <div className="flex items-center space-x-1">
              {change.type === "increase" ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  change.type === "increase"
                    ? "text-green-600"
                    : "text-red-600",
                )}
              >
                {change.value > 0 ? "+" : ""}
                {change.value}%
              </span>
            </div>
          )}
          {trend.length > 0 && <MiniChart data={trend} />}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

// Simple mini chart component for trend visualization
function MiniChart({ data }: { data: number[] }) {
  if (data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <div className="flex items-end h-8 space-x-0.5">
      {data.map((value, index) => {
        const height = ((value - min) / range) * 24 + 4;
        return (
          <div
            key={index}
            className="w-1 bg-primary rounded-sm opacity-70"
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}
