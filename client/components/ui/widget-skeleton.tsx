import { Skeleton } from "./skeleton";
import BaseWidget from "./widget";

interface WidgetSkeletonProps {
  title: string;
}

export function WidgetSkeleton({ title }: WidgetSkeletonProps) {
  return (
    <BaseWidget title={title}>
      <Skeleton className="h-full" />
    </BaseWidget>
  );
}
