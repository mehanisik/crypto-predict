import { Skeleton } from "./skeleton";
import BaseWidget from "./widget";

interface WidgetSkeletonProps {
  title: string;
}

export function WidgetSkeleton({ title }: WidgetSkeletonProps) {
  return (
    <BaseWidget title={title}>
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-1/2" />
      </div>
    </BaseWidget>
  );
}
