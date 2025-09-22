"use client";

import { useActivity } from "@/stores/app-store";

interface ActivityIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function ActivityIndicator({
  className = "",
  showDetails = false,
}: ActivityIndicatorProps) {
  const { activity } = useActivity();

  const getStatusStyle = () => {
    if (!activity.isActive) return "bg-muted-foreground text-muted-foreground";
    if (activity.isViewing) return "bg-accent text-accent-foreground";
    return "bg-primary text-primary-foreground";
  };

  const getStatusText = () => {
    if (!activity.isActive) return "Away";
    if (activity.isViewing && activity.viewingTarget)
      return `Viewing ${activity.viewingTarget}`;
    return "Active";
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`w-2 h-2 rounded-full ${getStatusStyle().split(" ")[0]} ${
          activity.isActive ? "animate-pulse" : ""
        }`}
      />
      {showDetails && (
        <span
          className={`text-sm ${getStatusStyle()
            .split(" ")
            .slice(1)
            .join(" ")}`}
        >
          {getStatusText()}
        </span>
      )}
    </div>
  );
}
